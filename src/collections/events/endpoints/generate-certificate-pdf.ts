import type { Endpoint } from 'payload'
import { generateCertificatePDF } from '@/lib/pdf/certificate-generator'
import type { CertificateData, CertificateTemplateType } from '@/lib/pdf/certificate-generator'
import { generateQRCodeBase64 } from '@/lib/qrcode'
import { generateCertificateNumber, generateCertificateHash } from '@/lib/token'

/**
 * Endpoint para gerar PDF de um certificado individual
 */
export const generateCertificatePDFEndpoint: Endpoint = {
  path: '/certificates/:certificateId/pdf',
  method: 'get',
  handler: async (req) => {
    const payload = req.payload

    try {
      const certificateId = req.routeParams?.certificateId

      if (!certificateId) {
        return Response.json(
          { success: false, error: 'ID do certificado é obrigatório' },
          { status: 400 }
        )
      }

      // Busca o certificado com dados relacionados
      const certificate = await payload.findByID({
        collection: 'certificates',
        id: certificateId,
        depth: 2,
      })

      if (!certificate) {
        return Response.json(
          { success: false, error: 'Certificado não encontrado' },
          { status: 404 }
        )
      }

      // Pega o tipo de template do certificado
      const templateType = (certificate.templateType as CertificateTemplateType) || 'default'

      // Gera QR Code de validação
      const validationUrl = 'https://oabsc.org.br/certificados/validar'
      const qrData = `${validationUrl}?hash=${certificate.validationHash}`
      const qrCodeBase64 = await generateQRCodeBase64(qrData, {
        width: 200,
        margin: 1,
        errorCorrectionLevel: 'M',
      })

      // Prepara dados do certificado
      const certificateData: CertificateData = {
        certificateNumber: certificate.certificateNumber as string,
        validationHash: certificate.validationHash as string,
        participantName: certificate.participantName as string,
        participantDocument: certificate.participantDocument as string,
        eventTitle: certificate.eventTitle as string,
        eventStartDate: certificate.eventStartDate as string,
        eventEndDate: certificate.eventEndDate as string,
        workload: certificate.workload as string,
        issuedAt: (certificate.issuedAt as string) || new Date().toISOString(),
        qrCodeBase64,
      }

      // Gera o PDF usando o template fixo
      const pdfBuffer = await generateCertificatePDF(certificateData, templateType)

      // Atualiza estatísticas do certificado
      await payload.update({
        collection: 'certificates',
        id: certificateId,
        data: {
          status: 'generated',
          downloadCount: ((certificate.downloadCount as number) || 0) + 1,
          lastDownloadAt: new Date().toISOString(),
          issuedAt: certificate.issuedAt || new Date().toISOString(),
        },
      })

      return new Response(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="certificado-${certificate.certificateNumber}.pdf"`,
        },
      })
    } catch (error: any) {
      console.error('Erro ao gerar PDF do certificado:', error)
      return Response.json(
        { success: false, error: error.message || 'Erro interno do servidor' },
        { status: 500 }
      )
    }
  },
}

/**
 * Endpoint para gerar certificado a partir de uma inscrição
 * (verifica elegibilidade: inscrição válida + presença confirmada)
 */
export const issueCertificateEndpoint: Endpoint = {
  path: '/registrations/:registrationId/certificate',
  method: 'post',
  handler: async (req) => {
    const payload = req.payload

    try {
      const registrationId = req.routeParams?.registrationId

      if (!registrationId) {
        return Response.json(
          { success: false, error: 'ID da inscrição é obrigatório' },
          { status: 400 }
        )
      }

      // Busca a inscrição com dados do evento
      const registration = await payload.findByID({
        collection: 'registrations',
        id: registrationId,
        depth: 2,
      })

      if (!registration) {
        return Response.json(
          { success: false, error: 'Inscrição não encontrada' },
          { status: 404 }
        )
      }

      const event = registration.event as any

      if (!event || typeof event === 'string') {
        return Response.json(
          { success: false, error: 'Evento não encontrado' },
          { status: 404 }
        )
      }

      // Verifica se o evento possui certificado
      if (!event.hasCertificate) {
        return Response.json(
          { success: false, error: 'Este evento não possui certificado' },
          { status: 400 }
        )
      }

      // Verifica elegibilidade
      const errors: string[] = []

      if (registration.status === 'cancelled') {
        errors.push('Inscrição cancelada')
      }

      if (registration.status !== 'attended') {
        errors.push('Presença não confirmada')
      }

      const isPaid = registration.paymentStatus === 'paid' || registration.paymentStatus === 'complimentary'
      if (!isPaid) {
        errors.push('Pagamento não confirmado')
      }

      if (errors.length > 0) {
        return Response.json(
          {
            success: false,
            error: 'Participante não elegível para certificado',
            errors,
          },
          { status: 400 }
        )
      }

      // Verifica se já existe certificado para esta inscrição
      const existingCerts = await payload.find({
        collection: 'certificates',
        where: {
          registration: { equals: registrationId },
          status: { not_equals: 'revoked' },
        },
        limit: 1,
      })

      if (existingCerts.docs.length > 0) {
        const existingCert = existingCerts.docs[0]
        return Response.json({
          success: true,
          message: 'Certificado já emitido anteriormente',
          certificate: {
            id: existingCert.id,
            certificateNumber: existingCert.certificateNumber,
            issuedAt: existingCert.issuedAt,
          },
        })
      }

      // Usa o template configurado no evento ou o padrão
      const templateType = (event.certificateTemplate as CertificateTemplateType) || 'default'

      // Gera número e hash do certificado
      const year = new Date().getFullYear()
      const existingCertsCount = await payload.count({
        collection: 'certificates',
        where: {
          event: { equals: event.id },
        },
      })

      const certificateNumber = generateCertificateNumber({
        eventId: event.id,
        year,
        sequence: existingCertsCount.totalDocs + 1,
      })

      const validationHash = generateCertificateHash({
        certificateNumber,
        participantName: registration.registrantName as string,
        eventTitle: event.title,
      })

      // Cria o certificado
      const certificate = await payload.create({
        collection: 'certificates',
        data: {
          certificateNumber,
          validationHash,
          event: event.id,
          registration: registrationId,
          templateType,
          participantType: registration.participantType,
          lawyer: registration.lawyer,
          externalParticipant: registration.externalParticipant,
          participantName: registration.registrantName,
          participantDocument: registration.registrantDocument,
          participantEmail: registration.email,
          eventTitle: event.title,
          eventStartDate: event.startDate,
          eventEndDate: event.endDate,
          workload: event.workload,
          status: 'pending',
          issuedAt: new Date().toISOString(),
        },
      })

      // Atualiza a inscrição
      await payload.update({
        collection: 'registrations',
        id: registrationId,
        data: {
          certificateIssued: true,
          certificate: certificate.id,
        },
      })

      return Response.json({
        success: true,
        message: 'Certificado emitido com sucesso',
        certificate: {
          id: certificate.id,
          certificateNumber: certificate.certificateNumber,
          validationHash: certificate.validationHash,
          downloadUrl: `/api/certificates/${certificate.id}/pdf`,
        },
      })
    } catch (error: any) {
      console.error('Erro ao emitir certificado:', error)
      return Response.json(
        { success: false, error: error.message || 'Erro interno do servidor' },
        { status: 500 }
      )
    }
  },
}

/**
 * Endpoint para gerar certificados em lote para um evento
 */
export const issueBatchCertificatesEndpoint: Endpoint = {
  path: '/events/:eventId/certificates/issue',
  method: 'post',
  handler: async (req) => {
    const payload = req.payload

    try {
      const eventId = req.routeParams?.eventId

      if (!eventId) {
        return Response.json(
          { success: false, error: 'ID do evento é obrigatório' },
          { status: 400 }
        )
      }

      const event = await payload.findByID({
        collection: 'events',
        id: eventId,
        depth: 1,
      })

      if (!event) {
        return Response.json(
          { success: false, error: 'Evento não encontrado' },
          { status: 404 }
        )
      }

      if (!event.hasCertificate) {
        return Response.json(
          { success: false, error: 'Este evento não possui certificado' },
          { status: 400 }
        )
      }

      // Busca inscrições elegíveis (presentes e pagas) que ainda não têm certificado
      const eligibleRegistrations = await payload.find({
        collection: 'registrations',
        where: {
          event: { equals: eventId },
          status: { equals: 'attended' },
          paymentStatus: { in: ['paid', 'complimentary'] },
          certificateIssued: { not_equals: true },
        },
        limit: 500,
      })

      if (eligibleRegistrations.docs.length === 0) {
        return Response.json({
          success: true,
          message: 'Nenhuma inscrição elegível encontrada sem certificado',
          issued: 0,
        })
      }

      // Usa o template configurado no evento ou o padrão
      const templateType = (event.certificateTemplate as CertificateTemplateType) || 'default'

      const year = new Date().getFullYear()
      const existingCertsCount = await payload.count({
        collection: 'certificates',
        where: { event: { equals: eventId } },
      })

      let sequence = existingCertsCount.totalDocs + 1
      const results: any[] = []

      for (const registration of eligibleRegistrations.docs) {
        try {
          const certificateNumber = generateCertificateNumber({
            eventId: event.id,
            year,
            sequence,
          })

          const validationHash = generateCertificateHash({
            certificateNumber,
            participantName: registration.registrantName as string,
            eventTitle: event.title as string,
          })

          const certificate = await payload.create({
            collection: 'certificates',
            data: {
              certificateNumber,
              validationHash,
              event: event.id,
              registration: registration.id,
              templateType,
              participantType: registration.participantType,
              lawyer: registration.lawyer,
              externalParticipant: registration.externalParticipant,
              participantName: registration.registrantName,
              participantDocument: registration.registrantDocument,
              participantEmail: registration.email,
              eventTitle: event.title,
              eventStartDate: event.startDate,
              eventEndDate: event.endDate,
              workload: event.workload,
              status: 'pending',
              issuedAt: new Date().toISOString(),
            },
          })

          await payload.update({
            collection: 'registrations',
            id: registration.id,
            data: {
              certificateIssued: true,
              certificate: certificate.id,
            },
          })

          results.push({
            registrationId: registration.id,
            certificateId: certificate.id,
            certificateNumber,
            success: true,
          })

          sequence++
        } catch (error: any) {
          results.push({
            registrationId: registration.id,
            success: false,
            error: error.message,
          })
        }
      }

      const successCount = results.filter((r) => r.success).length
      const errorCount = results.filter((r) => !r.success).length

      return Response.json({
        success: true,
        message: `Certificados emitidos: ${successCount} sucesso, ${errorCount} erros`,
        issued: successCount,
        errors: errorCount,
        results,
      })
    } catch (error: any) {
      console.error('Erro ao emitir certificados em lote:', error)
      return Response.json(
        { success: false, error: error.message || 'Erro interno do servidor' },
        { status: 500 }
      )
    }
  },
}

/**
 * Endpoint para validar um certificado pelo hash
 */
export const validateCertificateEndpoint: Endpoint = {
  path: '/certificates/validate',
  method: 'get',
  handler: async (req) => {
    const payload = req.payload

    try {
      const url = new URL(req.url)
      const hash = url.searchParams.get('hash')
      const number = url.searchParams.get('number')

      if (!hash && !number) {
        return Response.json(
          { success: false, error: 'Forneça hash ou number para validação' },
          { status: 400 }
        )
      }

      const whereClause: any = {}
      if (hash) {
        whereClause.validationHash = { equals: hash }
      } else if (number) {
        whereClause.certificateNumber = { equals: number }
      }

      const certificates = await payload.find({
        collection: 'certificates',
        where: whereClause,
        depth: 1,
        limit: 1,
      })

      if (certificates.docs.length === 0) {
        return Response.json({
          success: false,
          valid: false,
          message: 'Certificado não encontrado',
        })
      }

      const certificate = certificates.docs[0]
      const event = certificate.event as any

      if (certificate.status === 'revoked') {
        return Response.json({
          success: true,
          valid: false,
          message: 'Certificado revogado',
          certificate: {
            certificateNumber: certificate.certificateNumber,
            status: certificate.status,
            revokedAt: certificate.revokedAt,
            revokedReason: certificate.revokedReason,
          },
        })
      }

      return Response.json({
        success: true,
        valid: true,
        message: 'Certificado válido',
        certificate: {
          certificateNumber: certificate.certificateNumber,
          participantName: certificate.participantName,
          eventTitle: certificate.eventTitle,
          eventStartDate: certificate.eventStartDate,
          eventEndDate: certificate.eventEndDate,
          workload: certificate.workload,
          issuedAt: certificate.issuedAt,
          status: certificate.status,
        },
        event: event && typeof event !== 'string' ? {
          id: event.id,
          title: event.title,
        } : undefined,
      })
    } catch (error: any) {
      console.error('Erro ao validar certificado:', error)
      return Response.json(
        { success: false, error: error.message || 'Erro interno do servidor' },
        { status: 500 }
      )
    }
  },
}
