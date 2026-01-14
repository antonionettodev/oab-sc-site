import type { Endpoint } from 'payload'
import { generateTicketPDF, generateMultipleTicketsPDF } from '@/lib/pdf/ticket-generator'
import { generateQRCodeBase64, generateTicketQRData } from '@/lib/qrcode'
import { generateSecureToken } from '@/lib/token'

/**
 * Endpoint para gerar PDF de um ingresso individual
 */
export const generateTicketPDFEndpoint: Endpoint = {
  path: '/tickets/:ticketId/pdf',
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

      // Busca o ingresso com dados do evento
      const ticket = await payload.findByID({
        collection: 'tickets',
        id: ticketId,
        depth: 2,
      })

      if (!ticket) {
        return Response.json(
          { success: false, error: 'Ingresso não encontrado' },
          { status: 404 }
        )
      }

      const event = ticket.event as any

      if (!event || typeof event === 'string') {
        return Response.json(
          { success: false, error: 'Evento não encontrado' },
          { status: 404 }
        )
      }

      // Gera QR Code se não existir
      let qrToken = ticket.qrToken as string
      if (!qrToken) {
        qrToken = generateSecureToken(32)
        await payload.update({
          collection: 'tickets',
          id: ticketId,
          data: { qrToken },
        })
      }

      const qrData = generateTicketQRData({
        registrationId: ticket.registration as string,
        ticketId: ticket.id,
        eventId: event.id,
        token: qrToken,
      })

      const qrCodeBase64 = await generateQRCodeBase64(qrData, {
        width: 300,
        margin: 2,
        errorCorrectionLevel: 'M',
      })

      // Gera o PDF
      const pdfBuffer = await generateTicketPDF({
        ticketCode: ticket.ticketCode as string,
        participantName: ticket.participantName as string,
        participantDocument: ticket.participantDocument as string,
        ticketCategory: ticket.ticketCategory as string,
        event: {
          title: event.title,
          startDate: event.startDate,
          endDate: event.endDate,
          startTime: event.startTime,
          endTime: event.endTime,
          venue: event.venue,
        },
        qrCodeBase64,
      })

      // Atualiza data de impressão
      await payload.update({
        collection: 'tickets',
        id: ticketId,
        data: {
          ticketPrintedAt: new Date().toISOString(),
          qrCodeData: qrData,
        },
      })

      return new Response(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="ingresso-${ticket.ticketCode}.pdf"`,
        },
      })
    } catch (error: any) {
      console.error('Erro ao gerar PDF do ingresso:', error)
      return Response.json(
        { success: false, error: error.message || 'Erro interno do servidor' },
        { status: 500 }
      )
    }
  },
}

/**
 * Endpoint para gerar PDFs de múltiplos ingressos de um evento
 */
export const generateBatchTicketsPDFEndpoint: Endpoint = {
  path: '/events/:eventId/tickets/pdf',
  method: 'post',
  handler: async (req) => {
    const payload = req.payload

    try {
      const eventId = req.routeParams?.eventId
      const body = await req.json?.()

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

      // Filtros opcionais
      const whereClause: any = {
        event: { equals: eventId },
      }

      if (body?.ticketIds && Array.isArray(body.ticketIds)) {
        whereClause.id = { in: body.ticketIds }
      }

      if (body?.status) {
        whereClause.status = { equals: body.status }
      }

      if (body?.paymentStatus) {
        whereClause.paymentStatus = { equals: body.paymentStatus }
      }

      // Busca os ingressos
      const tickets = await payload.find({
        collection: 'tickets',
        where: whereClause,
        limit: body?.limit || 100,
        depth: 0,
      })

      if (tickets.docs.length === 0) {
        return Response.json(
          { success: false, error: 'Nenhum ingresso encontrado' },
          { status: 404 }
        )
      }

      // Prepara dados para geração dos PDFs
      const ticketDataList = await Promise.all(
        tickets.docs.map(async (ticket: any) => {
          let qrToken = ticket.qrToken as string
          if (!qrToken) {
            qrToken = generateSecureToken(32)
            await payload.update({
              collection: 'tickets',
              id: ticket.id,
              data: { qrToken },
            })
          }

          const qrData = generateTicketQRData({
            registrationId: ticket.registration as string,
            ticketId: ticket.id,
            eventId: eventId,
            token: qrToken,
          })

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
              ticketPrintedAt: new Date().toISOString(),
              qrCodeData: qrData,
            },
          })

          return {
            ticketCode: ticket.ticketCode as string,
            participantName: ticket.participantName as string,
            participantDocument: ticket.participantDocument as string,
            ticketCategory: ticket.ticketCategory as string,
            event: {
              title: event.title as string,
              startDate: event.startDate as string,
              endDate: event.endDate as string,
              startTime: event.startTime as string,
              endTime: event.endTime as string,
              venue: event.venue as string,
            },
            qrCodeBase64,
          }
        })
      )

      // Gera PDF com todos os ingressos
      const pdfBuffer = await generateMultipleTicketsPDF(ticketDataList)

      return new Response(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="ingressos-${event.slug || eventId}.pdf"`,
        },
      })
    } catch (error: any) {
      console.error('Erro ao gerar PDFs dos ingressos:', error)
      return Response.json(
        { success: false, error: error.message || 'Erro interno do servidor' },
        { status: 500 }
      )
    }
  },
}
