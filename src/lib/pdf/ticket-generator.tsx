import React from 'react'
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface TicketData {
  ticketCode: string
  participantName: string
  participantDocument: string
  ticketCategory?: string
  event: {
    title: string
    startDate: string
    endDate?: string
    startTime: string
    endTime: string
    venue: string
  }
  qrCodeBase64: string
}

const styles = StyleSheet.create({
  page: {
    padding: 20,
    backgroundColor: '#ffffff',
  },
  ticket: {
    border: '2px solid #1a365d',
    borderRadius: 8,
    padding: 20,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    borderBottom: '1px dashed #cccccc',
    paddingBottom: 15,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 4,
  },
  organizerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a365d',
  },
  ticketCodeContainer: {
    alignItems: 'flex-end',
  },
  ticketCodeLabel: {
    fontSize: 8,
    color: '#666666',
  },
  ticketCode: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a365d',
    letterSpacing: 1,
  },
  mainContent: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  eventInfo: {
    flex: 1,
    paddingRight: 20,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: 15,
    lineHeight: 1.3,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 9,
    color: '#666666',
    width: 60,
  },
  infoValue: {
    fontSize: 10,
    color: '#333333',
    flex: 1,
  },
  qrCodeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#f7fafc',
    borderRadius: 8,
  },
  qrCode: {
    width: 100,
    height: 100,
  },
  qrLabel: {
    fontSize: 7,
    color: '#666666',
    marginTop: 5,
    textAlign: 'center',
  },
  participantSection: {
    backgroundColor: '#edf2f7',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  participantLabel: {
    fontSize: 8,
    color: '#666666',
    marginBottom: 4,
  },
  participantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: 5,
  },
  participantDocument: {
    fontSize: 10,
    color: '#4a5568',
  },
  ticketCategory: {
    backgroundColor: '#c9a227',
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
    padding: '4 10',
    borderRadius: 4,
    position: 'absolute',
    top: 20,
    right: 20,
  },
  footer: {
    borderTop: '1px dashed #cccccc',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: '#999999',
  },
  cutLine: {
    borderTop: '1px dashed #cccccc',
    marginTop: 20,
    paddingTop: 10,
  },
  cutLineText: {
    fontSize: 8,
    color: '#999999',
    textAlign: 'center',
  },
})

const formatEventDate = (startDate: string, endDate?: string) => {
  const start = new Date(startDate)
  const formattedStart = format(start, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })

  if (endDate && endDate !== startDate) {
    const end = new Date(endDate)
    const formattedEnd = format(end, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    return `${formattedStart} a ${formattedEnd}`
  }

  return formattedStart
}

const TicketDocument: React.FC<{ data: TicketData }> = ({ data }) => (
  <Document>
    <Page size="A5" orientation="landscape" style={styles.page}>
      <View style={styles.ticket}>
        {data.ticketCategory && (
          <Text style={styles.ticketCategory}>{data.ticketCategory}</Text>
        )}

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>INGRESSO</Text>
            <Text style={styles.organizerName}>OAB/SC - Ordem dos Advogados do Brasil</Text>
          </View>
          <View style={styles.ticketCodeContainer}>
            <Text style={styles.ticketCodeLabel}>Código</Text>
            <Text style={styles.ticketCode}>{data.ticketCode}</Text>
          </View>
        </View>

        <View style={styles.mainContent}>
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>{data.event.title}</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Data:</Text>
              <Text style={styles.infoValue}>
                {formatEventDate(data.event.startDate, data.event.endDate)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Horário:</Text>
              <Text style={styles.infoValue}>
                {data.event.startTime} às {data.event.endTime}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Local:</Text>
              <Text style={styles.infoValue}>{data.event.venue}</Text>
            </View>
          </View>

          <View style={styles.qrCodeContainer}>
            <Image src={data.qrCodeBase64} style={styles.qrCode} />
            <Text style={styles.qrLabel}>Apresente este QR Code no check-in</Text>
          </View>
        </View>

        <View style={styles.participantSection}>
          <Text style={styles.participantLabel}>PARTICIPANTE</Text>
          <Text style={styles.participantName}>{data.participantName}</Text>
          <Text style={styles.participantDocument}>{data.participantDocument}</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Este ingresso é pessoal e intransferível
          </Text>
          <Text style={styles.footerText}>
            Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </Text>
        </View>
      </View>

      <View style={styles.cutLine}>
        <Text style={styles.cutLineText}>✂ Recorte aqui - Cole esta etiqueta no crachá</Text>
      </View>

      {/* Mini etiqueta para crachá */}
      <View style={[styles.ticket, { marginTop: 10, padding: 10 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#1a365d' }}>
              {data.participantName}
            </Text>
            <Text style={{ fontSize: 8, color: '#666666', marginTop: 2 }}>
              {data.participantDocument}
            </Text>
            <Text style={{ fontSize: 7, color: '#999999', marginTop: 4 }}>
              {data.event.title}
            </Text>
          </View>
          <Image src={data.qrCodeBase64} style={{ width: 50, height: 50 }} />
        </View>
      </View>
    </Page>
  </Document>
)

export const generateTicketPDF = async (data: TicketData): Promise<Buffer> => {
  const buffer = await renderToBuffer(<TicketDocument data={data} />)
  return Buffer.from(buffer)
}

export const generateMultipleTicketsPDF = async (tickets: TicketData[]): Promise<Buffer> => {
  const MultipleTicketsDocument = () => (
    <Document>
      {tickets.map((ticket, index) => (
        <Page key={index} size="A5" orientation="landscape" style={styles.page}>
          <View style={styles.ticket}>
            {ticket.ticketCategory && (
              <Text style={styles.ticketCategory}>{ticket.ticketCategory}</Text>
            )}

            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerTitle}>INGRESSO</Text>
                <Text style={styles.organizerName}>OAB/SC - Ordem dos Advogados do Brasil</Text>
              </View>
              <View style={styles.ticketCodeContainer}>
                <Text style={styles.ticketCodeLabel}>Código</Text>
                <Text style={styles.ticketCode}>{ticket.ticketCode}</Text>
              </View>
            </View>

            <View style={styles.mainContent}>
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>{ticket.event.title}</Text>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Data:</Text>
                  <Text style={styles.infoValue}>
                    {formatEventDate(ticket.event.startDate, ticket.event.endDate)}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Horário:</Text>
                  <Text style={styles.infoValue}>
                    {ticket.event.startTime} às {ticket.event.endTime}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Local:</Text>
                  <Text style={styles.infoValue}>{ticket.event.venue}</Text>
                </View>
              </View>

              <View style={styles.qrCodeContainer}>
                <Image src={ticket.qrCodeBase64} style={styles.qrCode} />
                <Text style={styles.qrLabel}>Apresente este QR Code no check-in</Text>
              </View>
            </View>

            <View style={styles.participantSection}>
              <Text style={styles.participantLabel}>PARTICIPANTE</Text>
              <Text style={styles.participantName}>{ticket.participantName}</Text>
              <Text style={styles.participantDocument}>{ticket.participantDocument}</Text>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Este ingresso é pessoal e intransferível
              </Text>
              <Text style={styles.footerText}>
                Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </Text>
            </View>
          </View>
        </Page>
      ))}
    </Document>
  )

  const buffer = await renderToBuffer(<MultipleTicketsDocument />)
  return Buffer.from(buffer)
}
