import type { Endpoint } from 'payload'
import { generateQRCodeBase64, generateEventQRData, generateTicketQRData } from '@/lib/qrcode'
import { generateSecureToken } from '@/lib/token'

/**
 * Endpoint para gerar QR Code fixo do evento (eventos internos)
 * Este QR Code deve ser impresso e fixado no local do evento
 */
export const generateEventQRCodeEndpoint: Endpoint = {
  path: '/events/:eventId/qrcode',
  method: 'get',
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
      })

      if (!event) {
        return Response.json(
          { success: false, error: 'Evento não encontrado' },
          { status: 404 }
        )
      }

      if (!event.checkinPassword) {
        return Response.json(
          { success: false, error: 'Evento não possui senha de check-in configurada' },
          { status: 400 }
        )
      }

      // Gera os dados do QR Code
      const qrData = generateEventQRData({
        eventId: event.id,
        checkinPassword: event.checkinPassword,
      })

      // Gera o QR Code em base64
      const qrCodeBase64 = await generateQRCodeBase64(qrData, {
        width: 400,
        margin: 2,
        errorCorrectionLevel: 'H', // Alta correção de erros para impressão
      })

      // Salva o QR Code no evento se ainda não estiver salvo
      if (!event.eventQrCode) {
        await payload.update({
          collection: 'events',
          id: eventId,
          data: {
            eventQrCode: qrCodeBase64,
          },
        })
      }

      return Response.json({
        success: true,
        event: {
          id: event.id,
          title: event.title,
          eventType: event.eventType,
          checkinPassword: event.checkinPassword,
        },
        qrCode: {
          base64: qrCodeBase64,
          data: qrData,
        },
        instructions: {
          pt: 'Imprima este QR Code e fixe no local do evento. Os participantes devem escanear para fazer check-in.',
        },
      })
    } catch (error: any) {
      console.error('Erro ao gerar QR Code do evento:', error)
      return Response.json(
        { success: false, error: error.message || 'Erro interno do servidor' },
        { status: 500 }
      )
    }
  },
}

/**
 * Endpoint para gerar QR Code individual de um ingresso (eventos externos)
 */
export const generateTicketQRCodeEndpoint: Endpoint = {
  path: '/tickets/:ticketId/qrcode',
  method: 'get',
  handler: async (req) => {
    const payload = req.payload

    try {
      const ticketId = req.routeParams?.ticketId

      if (!ticketId) {
        return Response.json(
          { success: false, error: 'ID do ingresso é obrigatório' },
          { status: 400 }
        )
      }

      const ticket = await payload.findByID({
        collection: 'tickets',
        id: ticketId,
      })

      if (!ticket) {
        return Response.json(
          { success: false, error: 'Ingresso não encontrado' },
          { status: 404 }
        )
      }

      // Gera um novo token se não existir
      let qrToken = ticket.qrToken
      if (!qrToken) {
        qrToken = generateSecureToken(32)
        await payload.update({
          collection: 'tickets',
          id: ticketId,
          data: {
            qrToken,
          },
        })
      }

      // Gera os dados do QR Code
      const qrData = generateTicketQRData({
        registrationId: ticket.registration as string,
        ticketId: ticket.id,
        eventId: ticket.event as string,
        token: qrToken,
      })

      // Gera o QR Code em base64
      const qrCodeBase64 = await generateQRCodeBase64(qrData, {
        width: 300,
        margin: 2,
        errorCorrectionLevel: 'M',
      })

      // Salva os dados do QR Code no ingresso
      if (!ticket.qrCodeData) {
        await payload.update({
          collection: 'tickets',
          id: ticketId,
          data: {
            qrCodeData: qrData,
          },
        })
      }

      return Response.json({
        success: true,
        ticket: {
          id: ticket.id,
          ticketCode: ticket.ticketCode,
          participantName: ticket.participantName,
          status: ticket.status,
        },
        qrCode: {
          base64: qrCodeBase64,
          data: qrData,
        },
      })
    } catch (error: any) {
      console.error('Erro ao gerar QR Code do ingresso:', error)
      return Response.json(
        { success: false, error: error.message || 'Erro interno do servidor' },
        { status: 500 }
      )
    }
  },
}

/**
 * Endpoint para gerar QR Codes em lote para todos os ingressos de um evento
 */
export const generateBatchTicketQRCodesEndpoint: Endpoint = {
  path: '/events/:eventId/tickets/qrcodes',
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
      })

      if (!event) {
        return Response.json(
          { success: false, error: 'Evento não encontrado' },
          { status: 404 }
        )
      }

      // Busca todos os ingressos do evento que ainda não têm QR Code
      const tickets = await payload.find({
        collection: 'tickets',
        where: {
          event: { equals: eventId },
          qrCodeData: { exists: false },
        },
        limit: 1000, // Processa até 1000 ingressos por vez
      })

      const results: any[] = []

      for (const ticket of tickets.docs) {
        try {
          // Gera token se necessário
          let qrToken = ticket.qrToken as string
          if (!qrToken) {
            qrToken = generateSecureToken(32)
          }

          // Gera dados do QR Code
          const qrData = generateTicketQRData({
            registrationId: ticket.registration as string,
            ticketId: ticket.id,
            eventId: ticket.event as string,
            token: qrToken,
          })

          // Gera QR Code em base64
          const qrCodeBase64 = await generateQRCodeBase64(qrData, {
            width: 300,
            margin: 2,
            errorCorrectionLevel: 'M',
          })

          // Atualiza o ingresso
          await payload.update({
            collection: 'tickets',
            id: ticket.id,
            data: {
              qrToken,
              qrCodeData: qrData,
            },
          })

          results.push({
            ticketId: ticket.id,
            ticketCode: ticket.ticketCode,
            success: true,
          })
        } catch (error: any) {
          results.push({
            ticketId: ticket.id,
            ticketCode: ticket.ticketCode,
            success: false,
            error: error.message,
          })
        }
      }

      const successCount = results.filter((r) => r.success).length
      const errorCount = results.filter((r) => !r.success).length

      return Response.json({
        success: true,
        message: `QR Codes gerados: ${successCount} sucesso, ${errorCount} erros`,
        processed: results.length,
        successCount,
        errorCount,
        results,
      })
    } catch (error: any) {
      console.error('Erro ao gerar QR Codes em lote:', error)
      return Response.json(
        { success: false, error: error.message || 'Erro interno do servidor' },
        { status: 500 }
      )
    }
  },
}
