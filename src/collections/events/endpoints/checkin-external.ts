import type { Endpoint } from 'payload'
import { generateQRCodeBase64, decodeQRData } from '@/lib/qrcode'

/**
 * Endpoint para check-in de eventos EXTERNOS (grande porte)
 * - Funcionário valida voucher/ingresso
 * - Valida pagamento
 * - Confirma presença
 * - Presença só válida se inscrição paga
 */
export const checkinExternalEndpoint: Endpoint = {
  path: '/checkin/external',
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

      const { qrData, ticketId, eventId, staffUserId, validateVoucher = true, confirmPresence = true } = body

      // Pode receber qrData (escaneado) ou ticketId diretamente
      let ticket: any
      let decodedQR: any

      if (qrData) {
        // Decodifica o QR Code escaneado
        try {
          decodedQR = decodeQRData(qrData)
        } catch {
          return Response.json(
            { success: false, error: 'QR Code inválido' },
            { status: 400 }
          )
        }

        if (decodedQR.type !== 'ticket') {
          return Response.json(
            { success: false, error: 'Este QR Code não é de um ingresso individual' },
            { status: 400 }
          )
        }

        // Busca o ingresso pelo token do QR Code
        const ticketsResult = await payload.find({
          collection: 'tickets',
          where: {
            qrToken: { equals: decodedQR.token },
            event: { equals: decodedQR.eventId },
          },
          limit: 1,
        })

        if (ticketsResult.docs.length === 0) {
          return Response.json(
            { success: false, error: 'Ingresso não encontrado' },
            { status: 404 }
          )
        }

        ticket = ticketsResult.docs[0]
      } else if (ticketId) {
        // Busca diretamente pelo ID do ingresso
        ticket = await payload.findByID({
          collection: 'tickets',
          id: ticketId,
        })

        if (!ticket) {
          return Response.json(
            { success: false, error: 'Ingresso não encontrado' },
            { status: 404 }
          )
        }
      } else {
        return Response.json(
          { success: false, error: 'Forneça qrData ou ticketId' },
          { status: 400 }
        )
      }

      // Verificações do ingresso
      const errors: string[] = []

      if (ticket.status === 'cancelled') {
        errors.push('Ingresso cancelado')
      }

      if (ticket.status === 'expired') {
        errors.push('Ingresso expirado')
      }

      if (ticket.status === 'used') {
        errors.push('Ingresso já utilizado')
      }

      // Busca o evento para verificar configurações
      const event = await payload.findByID({
        collection: 'events',
        id: ticket.event,
      })

      if (!event) {
        return Response.json(
          { success: false, error: 'Evento não encontrado' },
          { status: 404 }
        )
      }

      // Verifica se o evento exige pagamento para check-in
      if (event.requirePaymentForCheckin && ticket.paymentStatus !== 'paid' && ticket.paymentStatus !== 'complimentary') {
        errors.push('Pagamento não confirmado - check-in não permitido')
      }

      // Se há erros, cria registro de check-in inválido e retorna
      if (errors.length > 0) {
        await payload.create({
          collection: 'checkins',
          data: {
            event: ticket.event,
            registration: ticket.registration,
            ticket: ticket.id,
            participantType: ticket.participantType,
            lawyer: ticket.lawyer,
            externalParticipant: ticket.externalParticipant,
            participantName: ticket.participantName,
            participantDocument: ticket.participantDocument,
            checkinType: 'qr-individual',
            checkinMethod: 'qr-code',
            checkinAt: new Date().toISOString(),
            checkinBy: staffUserId,
            isValid: false,
            voucherValidated: false,
            paymentValidated: false,
            presenceConfirmed: false,
            qrCodeData: qrData,
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
            ticket: {
              id: ticket.id,
              ticketCode: ticket.ticketCode,
              participantName: ticket.participantName,
              status: ticket.status,
              paymentStatus: ticket.paymentStatus,
            },
          },
          { status: 400 }
        )
      }

      // Check-in válido - atualiza o ingresso e cria registro
      const now = new Date().toISOString()

      await payload.update({
        collection: 'tickets',
        id: ticket.id,
        data: {
          status: 'used',
          checkedInAt: now,
          voucherValidated: validateVoucher,
          presenceConfirmed: confirmPresence,
        },
      })

      // Atualiza a inscrição relacionada
      if (ticket.registration) {
        const registration = await payload.findByID({
          collection: 'registrations',
          id: ticket.registration,
        })

        if (registration) {
          await payload.update({
            collection: 'registrations',
            id: ticket.registration,
            data: {
              status: confirmPresence ? 'attended' : 'checked-in',
              checkInAt: registration.checkInAt || now,
              presenceConfirmedAt: confirmPresence ? now : undefined,
              certificateEligible: confirmPresence && (registration.paymentStatus === 'paid' || registration.paymentStatus === 'complimentary'),
            },
          })
        }
      }

      // Cria registro de check-in válido
      const checkin = await payload.create({
        collection: 'checkins',
        data: {
          event: ticket.event,
          registration: ticket.registration,
          ticket: ticket.id,
          participantType: ticket.participantType,
          lawyer: ticket.lawyer,
          externalParticipant: ticket.externalParticipant,
          participantName: ticket.participantName,
          participantDocument: ticket.participantDocument,
          checkinType: 'qr-individual',
          checkinMethod: 'qr-code',
          checkinAt: now,
          checkinBy: staffUserId,
          isValid: true,
          voucherValidated: validateVoucher,
          paymentValidated: ticket.paymentStatus === 'paid' || ticket.paymentStatus === 'complimentary',
          presenceConfirmed: confirmPresence,
          qrCodeData: qrData,
          tokenValidated: ticket.qrToken,
        },
      })

      return Response.json({
        success: true,
        message: 'Check-in realizado com sucesso',
        checkin: {
          id: checkin.id,
          checkinAt: now,
        },
        ticket: {
          id: ticket.id,
          ticketCode: ticket.ticketCode,
          participantName: ticket.participantName,
          participantDocument: ticket.participantDocument,
          ticketCategory: ticket.ticketCategory,
        },
        event: {
          id: event.id,
          title: event.title,
        },
      })
    } catch (error: any) {
      console.error('Erro no check-in externo:', error)
      return Response.json(
        { success: false, error: error.message || 'Erro interno do servidor' },
        { status: 500 }
      )
    }
  },
}

/**
 * Endpoint para buscar ingresso por código ou documento
 * (para quando o QR Code não funciona)
 */
export const searchTicketEndpoint: Endpoint = {
  path: '/checkin/search',
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

      const { eventId, ticketCode, participantDocument, participantName } = body

      if (!eventId) {
        return Response.json(
          { success: false, error: 'ID do evento é obrigatório' },
          { status: 400 }
        )
      }

      const whereClause: any = {
        event: { equals: eventId },
      }

      if (ticketCode) {
        whereClause.ticketCode = { equals: ticketCode }
      } else if (participantDocument) {
        whereClause.participantDocument = { contains: participantDocument }
      } else if (participantName) {
        whereClause.participantName = { contains: participantName }
      } else {
        return Response.json(
          { success: false, error: 'Forneça ticketCode, participantDocument ou participantName' },
          { status: 400 }
        )
      }

      const tickets = await payload.find({
        collection: 'tickets',
        where: whereClause,
        limit: 20,
      })

      return Response.json({
        success: true,
        tickets: tickets.docs.map((ticket: any) => ({
          id: ticket.id,
          ticketCode: ticket.ticketCode,
          participantName: ticket.participantName,
          participantDocument: ticket.participantDocument,
          participantType: ticket.participantType,
          ticketCategory: ticket.ticketCategory,
          status: ticket.status,
          paymentStatus: ticket.paymentStatus,
          checkedInAt: ticket.checkedInAt,
        })),
        total: tickets.totalDocs,
      })
    } catch (error: any) {
      console.error('Erro na busca de ingresso:', error)
      return Response.json(
        { success: false, error: error.message || 'Erro interno do servidor' },
        { status: 500 }
      )
    }
  },
}
