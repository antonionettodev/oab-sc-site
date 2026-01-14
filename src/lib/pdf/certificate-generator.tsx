import React from 'react'
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CertificateTemplate {
  orientation: 'landscape' | 'portrait'
  pageSize: 'A4' | 'LETTER'
  backgroundImage?: string
  logo?: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  headerText: string
  titleText: string
  bodyTemplate: string
  footerText?: string
  signatures?: Array<{
    name: string
    title: string
    signatureImage?: string
  }>
  showQRCode: boolean
  validationUrl?: string
}

interface CertificateData {
  certificateNumber: string
  validationHash: string
  participantName: string
  participantDocument?: string
  eventTitle: string
  eventStartDate: string
  eventEndDate?: string
  workload?: string
  issuedAt: string
  qrCodeBase64?: string
}

const defaultTemplate: CertificateTemplate = {
  orientation: 'landscape',
  pageSize: 'A4',
  primaryColor: '#1a365d',
  secondaryColor: '#2b6cb0',
  accentColor: '#c9a227',
  headerText: 'ORDEM DOS ADVOGADOS DO BRASIL - SECCIONAL SANTA CATARINA',
  titleText: 'CERTIFICADO',
  bodyTemplate: 'Certificamos que {{participantName}} participou do evento "{{eventTitle}}", realizado em {{eventDate}}, com carga horária de {{workload}}.',
  showQRCode: true,
}

const createStyles = (template: CertificateTemplate) =>
  StyleSheet.create({
    page: {
      position: 'relative',
    },
    backgroundImage: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
    },
    container: {
      flex: 1,
      padding: 50,
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    border: {
      position: 'absolute',
      top: 20,
      left: 20,
      right: 20,
      bottom: 20,
      border: `3px solid ${template.accentColor}`,
    },
    innerBorder: {
      position: 'absolute',
      top: 25,
      left: 25,
      right: 25,
      bottom: 25,
      border: `1px solid ${template.accentColor}`,
    },
    header: {
      alignItems: 'center',
      marginBottom: 20,
    },
    logo: {
      width: 80,
      height: 80,
      marginBottom: 15,
    },
    headerText: {
      fontSize: 12,
      color: template.secondaryColor,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    titleContainer: {
      alignItems: 'center',
      marginBottom: 30,
    },
    title: {
      fontSize: 36,
      fontWeight: 'bold',
      color: template.primaryColor,
      letterSpacing: 6,
    },
    decorativeLine: {
      width: 100,
      height: 2,
      backgroundColor: template.accentColor,
      marginTop: 10,
    },
    bodyContainer: {
      alignItems: 'center',
      maxWidth: '80%',
      marginBottom: 30,
    },
    bodyText: {
      fontSize: 14,
      color: '#333333',
      textAlign: 'center',
      lineHeight: 1.8,
    },
    participantName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: template.primaryColor,
      marginBottom: 15,
      textAlign: 'center',
    },
    signaturesContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 40,
      gap: 60,
    },
    signatureBox: {
      alignItems: 'center',
      width: 200,
    },
    signatureLine: {
      width: 180,
      borderBottom: `1px solid ${template.primaryColor}`,
      marginBottom: 5,
    },
    signatureImage: {
      width: 100,
      height: 40,
      marginBottom: 5,
    },
    signatureName: {
      fontSize: 11,
      fontWeight: 'bold',
      color: template.primaryColor,
      textAlign: 'center',
    },
    signatureTitle: {
      fontSize: 9,
      color: '#666666',
      textAlign: 'center',
    },
    footer: {
      position: 'absolute',
      bottom: 35,
      left: 50,
      right: 50,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    footerLeft: {
      maxWidth: '60%',
    },
    footerText: {
      fontSize: 8,
      color: '#666666',
    },
    certificateNumber: {
      fontSize: 9,
      color: template.secondaryColor,
      marginTop: 5,
    },
    qrCodeContainer: {
      alignItems: 'center',
    },
    qrCode: {
      width: 60,
      height: 60,
    },
    qrLabel: {
      fontSize: 7,
      color: '#666666',
      marginTop: 3,
      textAlign: 'center',
    },
    validationHash: {
      fontSize: 7,
      color: '#999999',
      fontFamily: 'Courier',
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

const processBodyTemplate = (template: string, data: CertificateData): string => {
  const eventDate = formatEventDate(data.eventStartDate, data.eventEndDate)

  return template
    .replace(/\{\{participantName\}\}/g, data.participantName)
    .replace(/\{\{eventTitle\}\}/g, data.eventTitle)
    .replace(/\{\{eventDate\}\}/g, eventDate)
    .replace(/\{\{startDate\}\}/g, format(new Date(data.eventStartDate), 'dd/MM/yyyy'))
    .replace(/\{\{endDate\}\}/g, data.eventEndDate ? format(new Date(data.eventEndDate), 'dd/MM/yyyy') : '')
    .replace(/\{\{workload\}\}/g, data.workload || 'N/A')
    .replace(/\{\{certificateNumber\}\}/g, data.certificateNumber)
}

interface CertificateDocumentProps {
  data: CertificateData
  template?: Partial<CertificateTemplate>
}

const CertificateDocument: React.FC<CertificateDocumentProps> = ({
  data,
  template: customTemplate,
}) => {
  const template = { ...defaultTemplate, ...customTemplate }
  const styles = createStyles(template)
  const bodyText = processBodyTemplate(template.bodyTemplate, data)

  return (
    <Document>
      <Page
        size={template.pageSize}
        orientation={template.orientation}
        style={styles.page}
      >
        {template.backgroundImage && (
          <Image src={template.backgroundImage} style={styles.backgroundImage} />
        )}

        <View style={styles.border} />
        <View style={styles.innerBorder} />

        <View style={styles.container}>
          <View style={styles.header}>
            {template.logo && <Image src={template.logo} style={styles.logo} />}
            <Text style={styles.headerText}>{template.headerText}</Text>
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.title}>{template.titleText}</Text>
            <View style={styles.decorativeLine} />
          </View>

          <View style={styles.bodyContainer}>
            <Text style={styles.participantName}>{data.participantName}</Text>
            <Text style={styles.bodyText}>{bodyText}</Text>
          </View>

          {template.signatures && template.signatures.length > 0 && (
            <View style={styles.signaturesContainer}>
              {template.signatures.map((sig, index) => (
                <View key={index} style={styles.signatureBox}>
                  {sig.signatureImage && (
                    <Image src={sig.signatureImage} style={styles.signatureImage} />
                  )}
                  <View style={styles.signatureLine} />
                  <Text style={styles.signatureName}>{sig.name}</Text>
                  <Text style={styles.signatureTitle}>{sig.title}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            {template.footerText && (
              <Text style={styles.footerText}>{template.footerText}</Text>
            )}
            <Text style={styles.certificateNumber}>
              Certificado Nº {data.certificateNumber}
            </Text>
            <Text style={styles.footerText}>
              Emitido em {format(new Date(data.issuedAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </Text>
            <Text style={styles.validationHash}>
              Hash: {data.validationHash}
            </Text>
          </View>

          {template.showQRCode && data.qrCodeBase64 && (
            <View style={styles.qrCodeContainer}>
              <Image src={data.qrCodeBase64} style={styles.qrCode} />
              <Text style={styles.qrLabel}>Validar certificado</Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  )
}

export const generateCertificatePDF = async (
  data: CertificateData,
  template?: Partial<CertificateTemplate>
): Promise<Buffer> => {
  const buffer = await renderToBuffer(<CertificateDocument data={data} template={template} />)
  return Buffer.from(buffer)
}

export const generateMultipleCertificatesPDF = async (
  certificates: Array<{ data: CertificateData; template?: Partial<CertificateTemplate> }>
): Promise<Buffer> => {
  const MultipleCertificatesDocument = () => (
    <Document>
      {certificates.map((cert, index) => {
        const template = { ...defaultTemplate, ...cert.template }
        const styles = createStyles(template)
        const bodyText = processBodyTemplate(template.bodyTemplate, cert.data)

        return (
          <Page
            key={index}
            size={template.pageSize}
            orientation={template.orientation}
            style={styles.page}
          >
            {template.backgroundImage && (
              <Image src={template.backgroundImage} style={styles.backgroundImage} />
            )}

            <View style={styles.border} />
            <View style={styles.innerBorder} />

            <View style={styles.container}>
              <View style={styles.header}>
                {template.logo && <Image src={template.logo} style={styles.logo} />}
                <Text style={styles.headerText}>{template.headerText}</Text>
              </View>

              <View style={styles.titleContainer}>
                <Text style={styles.title}>{template.titleText}</Text>
                <View style={styles.decorativeLine} />
              </View>

              <View style={styles.bodyContainer}>
                <Text style={styles.participantName}>{cert.data.participantName}</Text>
                <Text style={styles.bodyText}>{bodyText}</Text>
              </View>

              {template.signatures && template.signatures.length > 0 && (
                <View style={styles.signaturesContainer}>
                  {template.signatures.map((sig, sigIndex) => (
                    <View key={sigIndex} style={styles.signatureBox}>
                      {sig.signatureImage && (
                        <Image src={sig.signatureImage} style={styles.signatureImage} />
                      )}
                      <View style={styles.signatureLine} />
                      <Text style={styles.signatureName}>{sig.name}</Text>
                      <Text style={styles.signatureTitle}>{sig.title}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.footer}>
              <View style={styles.footerLeft}>
                {template.footerText && (
                  <Text style={styles.footerText}>{template.footerText}</Text>
                )}
                <Text style={styles.certificateNumber}>
                  Certificado Nº {cert.data.certificateNumber}
                </Text>
                <Text style={styles.footerText}>
                  Emitido em {format(new Date(cert.data.issuedAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </Text>
                <Text style={styles.validationHash}>
                  Hash: {cert.data.validationHash}
                </Text>
              </View>

              {template.showQRCode && cert.data.qrCodeBase64 && (
                <View style={styles.qrCodeContainer}>
                  <Image src={cert.data.qrCodeBase64} style={styles.qrCode} />
                  <Text style={styles.qrLabel}>Validar certificado</Text>
                </View>
              )}
            </View>
          </Page>
        )
      })}
    </Document>
  )

  const buffer = await renderToBuffer(<MultipleCertificatesDocument />)
  return Buffer.from(buffer)
}

export type { CertificateData, CertificateTemplate }
