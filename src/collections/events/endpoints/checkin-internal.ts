import type { Endpoint } from 'payload'
import { decodeQRData } from '@/lib/qrcode'

/**
 * Endpoint para check-in de eventos INTERNOS (self-service)
 * - Participante escaneia QR Code fixo do evento
 * - Sistema valida inscrição automaticamente
 * - Sem necessidade de funcionário
 */
export const checkinInternalEndpoint: Endpoint = {
  path: '/checkin/internal',
  method: 'post',
  handler: async (req) => {
    const payload = req.payload

    try {
      const body = await req.json?.()

      if (!body) {
        return Response.json(
          { success: false, error: 'Corpo da requisição inválido' },
          { status: 400 }
        )
      }

      const { qrData, eventId, checkinPassword, participantDocument, lawyerId, externalParticipantId } = body

      let event: any
      let passwordToValidate: string | undefined

      // Pode receber qrData (QR Code do evento escaneado) ou eventId + checkinPassword
      if (qrData) {
        try {
          const decodedQR = decodeQRData(qrData)

          if (decodedQR.type !== 'event') {
            return Response.json(
              { success: false, error: 'Este QR Code não é de um evento. Use o QR Code fixado no local.' },
              { status: 400 }
            )
          }

          event = await payload.findByID({
            collection: 'events',
            id: decodedQR.eventId,
          })

          passwordToValidate = decodedQR.checkinPassword
        } catch {
          return Response.json(
            { success: false, error: 'QR Code inválido' },
            { status: 400 }
          )
        }
      } else if (eventId && checkinPassword) {
        event = await payload.findByID({
          collection: 'events',
          id: eventId,
        })
        passwordToValidate = checkinPassword
      } else {
        return Response.json(
          { success: false, error: 'Forneça qrData ou eventId com checkinPassword' },
          { status: 400 }
        )
      }

      if (!event) {
        return Response.json(
          { success: false, error: 'Evento não encontrado' },
          { status: 404 }
        )
      }

      // Valida se é um evento interno
      if (event.eventType !== 'internal') {
        return Response.json(
          { success: false, error: 'Este evento requer check-in com funcionário' },
          { status: 400 }
        )
      }

      // Valida a senha de check-in
      if (event.checkinPassword !== passwordToValidate) {
        return Response.json(
          { success: false, error: 'Senha de check-in inválida' },
          { status: 401 }
        )
      }

      // Busca a inscrição do participante
      let registration: any

      if (lawyerId) {
        const registrations = await payload.find({
          collection: 'registrations',
          where: {
            event: { equals: event.id },
            lawyer: { equals: lawyerId },
            participantType: { equals: 'lawyer' },
          },
          limit: 1,
        })
        registration = registrations.docs[0]
      } else if (externalParticipantId) {
        const registrations = await payload.find({
          collection: 'registrations',
          where: {
            event: { equals: event.id },
            externalParticipant: { equals: externalParticipantId },
            participantType: { equals: 'external' },
          },
          limit: 1,
        })
        registration = registrations.docs[0]
      } else if (participantDocument) {
        const registrations = await payload.find({
          collection: 'registrations',
          where: {
            event: { equals: event.id },
            registrantDocument: { equals: participantDocument },
          },
          limit: 1,
        })
        registration = registrations.docs[0]
      } else {
        return Response.json(
          { success: false, error: 'Forneça lawyerId, externalParticipantId ou participantDocument' },
          { status: 400 }
        )
      }

      if (!registration) {
        return Response.json(
          { success: false, error: 'Inscrição não encontrada para este evento' },
          { status: 404 }
        )
      }

      // Verificações da inscrição
      const errors: string[] = []

      if (registration.status === 'cancelled') {
        errors.push('Inscrição cancelada')
      }

      // Verifica pagamento se necessário
      if (event.requirePaymentForCheckin) {
        if (registration.paymentStatus !== 'paid' && registration.paymentStatus !== 'complimentary') {
          errors.push('Pagamento não confirmado - check-in não permitido')
        }
      }

      // Verifica se já fez check-in
      if (registration.status === 'checked-in' || registration.status === 'attended') {
        return Response.json({
          success: true,
          message: 'Check-in já realizado anteriormente',
          alreadyCheckedIn: true,
          registration: {
            id: registration.id,
            registrationCode: registration.registrationCode,
            registrantName: registration.registrantName,
            checkInAt: registration.checkInAt,
          },
          event: {
            id: event.id,
            title: event.title,
          },
        })
      }

      // Se há erros, cria registro de check-in inválido
      if (errors.length > 0) {
        await payload.create({
          collection: 'checkins',
          data: {
            event: event.id,
            registration: registration.id,
            participantType: registration.participantType,
            lawyer: registration.lawyer,
            externalParticipant: registration.externalParticipant,
            participantName: registration.registrantName,
            participantDocument: registration.registrantDocument,
            checkinType: 'qr-event',
            checkinMethod: 'password',
            checkinAt: new Date().toISOString(),
            isValid: false,
            voucherValidated: false,
            paymentValidated: false,
            presenceConfirmed: false,
            passwordUsed: passwordToValidate,
            validationErrors: errors.map((error) => ({
              error,
              timestamp: new Date().toISOString(),
            })),
          },
        })

        return Response.json(
          {
            success: false,
            error: 'Check-in inválido',
            errors,
            registration: {
              id: registration.id,
              registrationCode: registration.registrationCode,
              registrantName: registration.registrantName,
              status: registration.status,
              paymentStatus: registration.paymentStatus,
            },
          },
          { status: 400 }
        )
      }

      // Check-in válido
      const now = new Date().toISOString()
      const isPaid = registration.paymentStatus === 'paid' || registration.paymentStatus === 'complimentary'

      // Atualiza a inscrição
      await payload.update({
        collection: 'registrations',
        id: registration.id,
        data: {
          status: 'attended',
          checkInAt: now,
          presenceConfirmedAt: now,
          certificateEligible: isPaid && event.hasCertificate,
        },
      })

      // Cria registro de check-in válido
      const checkin = await payload.create({
        collection: 'checkins',
        data: {
          event: event.id,
          registration: registration.id,
          participantType: registration.participantType,
          lawyer: registration.lawyer,
          externalParticipant: registration.externalParticipant,
          participantName: registration.registrantName,
          participantDocument: registration.registrantDocument,
          checkinType: 'qr-event',
          checkinMethod: 'password',
          checkinAt: now,
          isValid: true,
          voucherValidated: true,
          paymentValidated: isPaid,
          presenceConfirmed: true,
          passwordUsed: passwordToValidate,
        },
      })

      return Response.json({
        success: true,
        message: 'Check-in realizado com sucesso!',
        checkin: {
          id: checkin.id,
          checkinAt: now,
        },
        registration: {
          id: registration.id,
          registrationCode: registration.registrationCode,
          registrantName: registration.registrantName,
          certificateEligible: isPaid && event.hasCertificate,
        },
        event: {
          id: event.id,
          title: event.title,
          hasCertificate: event.hasCertificate,
        },
      })
    } catch (error: any) {
      console.error('Erro no check-in interno:', error)
      return Response.json(
        { success: false, error: error.message || 'Erro interno do servidor' },
        { status: 500 }
      )
    }
  },
}

/**
 * Endpoint para validar inscrição antes do check-in
 * (para o participante verificar se está inscrito)
 */
export const validateRegistrationEndpoint: Endpoint = {
  path: '/checkin/validate',
  method: 'post',
  handler: async (req) => {
    const payload = req.payload

    try {
      const body = await req.json?.()

      if (!body) {
        return Response.json(
          { success: false, error: 'Corpo da requisição inválido' },
          { status: 400 }
        )
      }

      const { eventId, participantDocument, lawyerId, externalParticipantId } = body

      if (!eventId) {
        return Response.json(
          { success: false, error: 'ID do evento é obrigatório' },
          { status: 400 }
        )
      }

      const event = await payload.findByID({
        collection: 'events',
        id: eventId,
      })

      if (!event) {
        return Response.json(
          { success: false, error: 'Evento não encontrado' },
          { status: 404 }
        )
      }

      // Busca a inscrição
      let registration: any

      if (lawyerId) {
        const registrations = await payload.find({
          collection: 'registrations',
          where: {
            event: { equals: eventId },
            lawyer: { equals: lawyerId },
          },
          limit: 1,
        })
        registration = registrations.docs[0]
      } else if (externalParticipantId) {
        const registrations = await payload.find({
          collection: 'registrations',
          where: {
            event: { equals: eventId },
            externalParticipant: { equals: externalParticipantId },
          },
          limit: 1,
        })
        registration = registrations.docs[0]
      } else if (participantDocument) {
        const registrations = await payload.find({
          collection: 'registrations',
          where: {
            event: { equals: eventId },
            registrantDocument: { contains: participantDocument },
          },
          limit: 1,
        })
        registration = registrations.docs[0]
      } else {
        return Response.json(
          { success: false, error: 'Forneça lawyerId, externalParticipantId ou participantDocument' },
          { status: 400 }
        )
      }

      if (!registration) {
        return Response.json({
          success: false,
          isRegistered: false,
          message: 'Inscrição não encontrada para este evento',
        })
      }

      const isPaid = registration.paymentStatus === 'paid' || registration.paymentStatus === 'complimentary'
      const canCheckin = registration.status !== 'cancelled' && (!event.requirePaymentForCheckin || isPaid)

      return Response.json({
        success: true,
        isRegistered: true,
        canCheckin,
        registration: {
          id: registration.id,
          registrationCode: registration.registrationCode,
          registrantName: registration.registrantName,
          status: registration.status,
          paymentStatus: registration.paymentStatus,
          hasCheckedIn: registration.status === 'checked-in' || registration.status === 'attended',
          checkInAt: registration.checkInAt,
        },
        event: {
          id: event.id,
          title: event.title,
          requirePaymentForCheckin: event.requirePaymentForCheckin,
        },
      })
    } catch (error: any) {
      console.error('Erro na validação de inscrição:', error)
      return Response.json(
        { success: false, error: error.message || 'Erro interno do servidor' },
        { status: 500 }
      )
    }
  },
}
