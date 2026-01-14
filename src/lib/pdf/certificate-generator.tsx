import React from 'react'
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Tipos de templates disponíveis
export type CertificateTemplateType = 'default' | 'course' | 'event' | 'workshop' | 'seminar'

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

// Templates pré-definidos
const templates: Record<CertificateTemplateType, {
  headerText: string
  titleText: string
  bodyTemplate: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
}> = {
  default: {
    headerText: 'ORDEM DOS ADVOGADOS DO BRASIL - SECCIONAL SANTA CATARINA',
    titleText: 'CERTIFICADO',
    bodyTemplate: 'Certificamos que {{participantName}} participou do evento "{{eventTitle}}", realizado em {{eventDate}}, com carga horária de {{workload}}.',
    primaryColor: '#1a365d',
    secondaryColor: '#2b6cb0',
    accentColor: '#c9a227',
  },
  course: {
    headerText: 'ORDEM DOS ADVOGADOS DO BRASIL - SECCIONAL SANTA CATARINA',
    titleText: 'CERTIFICADO DE CONCLUSÃO',
    bodyTemplate: 'Certificamos que {{participantName}} concluiu com êxito o curso "{{eventTitle}}", realizado no período de {{eventDate}}, com carga horária total de {{workload}}.',
    primaryColor: '#1a365d',
    secondaryColor: '#2b6cb0',
    accentColor: '#c9a227',
  },
  event: {
    headerText: 'ORDEM DOS ADVOGADOS DO BRASIL - SECCIONAL SANTA CATARINA',
    titleText: 'CERTIFICADO DE PARTICIPAÇÃO',
    bodyTemplate: 'Certificamos que {{participantName}} participou do evento "{{eventTitle}}", realizado em {{eventDate}}, com carga horária de {{workload}}.',
    primaryColor: '#1a365d',
    secondaryColor: '#2b6cb0',
    accentColor: '#c9a227',
  },
  workshop: {
    headerText: 'ORDEM DOS ADVOGADOS DO BRASIL - SECCIONAL SANTA CATARINA',
    titleText: 'CERTIFICADO DE PARTICIPAÇÃO',
    bodyTemplate: 'Certificamos que {{participantName}} participou do workshop "{{eventTitle}}", realizado em {{eventDate}}, com carga horária de {{workload}}.',
    primaryColor: '#1a365d',
    secondaryColor: '#2b6cb0',
    accentColor: '#38a169',
  },
  seminar: {
    headerText: 'ORDEM DOS ADVOGADOS DO BRASIL - SECCIONAL SANTA CATARINA',
    titleText: 'CERTIFICADO DE PARTICIPAÇÃO',
    bodyTemplate: 'Certificamos que {{participantName}} participou do seminário "{{eventTitle}}", realizado em {{eventDate}}, com carga horária de {{workload}}.',
    primaryColor: '#1a365d',
    secondaryColor: '#2b6cb0',
    accentColor: '#805ad5',
  },
}

const createStyles = (template: typeof templates.default) =>
  StyleSheet.create({
    page: {
      position: 'relative',
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
      marginTop: 30,
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
      gap: 80,
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

const processBodyTemplate = (templateText: string, data: CertificateData): string => {
  const eventDate = formatEventDate(data.eventStartDate, data.eventEndDate)

  return templateText
    .replace(/\{\{participantName\}\}/g, data.participantName)
    .replace(/\{\{eventTitle\}\}/g, data.eventTitle)
    .replace(/\{\{eventDate\}\}/g, eventDate)
    .replace(/\{\{startDate\}\}/g, format(new Date(data.eventStartDate), 'dd/MM/yyyy'))
    .replace(/\{\{endDate\}\}/g, data.eventEndDate ? format(new Date(data.eventEndDate), 'dd/MM/yyyy') : '')
    .replace(/\{\{workload\}\}/g, data.workload || 'N/A')
    .replace(/\{\{certificateNumber\}\}/g, data.certificateNumber)
}

// Assinaturas padrão da OAB/SC
const defaultSignatures = [
  {
    name: 'Nome do Presidente',
    title: 'Presidente da OAB/SC',
  },
  {
    name: 'Nome do Diretor',
    title: 'Diretor da ESA/SC',
  },
]

interface CertificateDocumentProps {
  data: CertificateData
  templateType?: CertificateTemplateType
  signatures?: Array<{ name: string; title: string }>
}

const CertificateDocument: React.FC<CertificateDocumentProps> = ({
  data,
  templateType = 'default',
  signatures = defaultSignatures,
}) => {
  const template = templates[templateType] || templates.default
  const styles = createStyles(template)
  const bodyText = processBodyTemplate(template.bodyTemplate, data)

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.border} />
        <View style={styles.innerBorder} />

        <View style={styles.container}>
          <View style={styles.header}>
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

          {signatures.length > 0 && (
            <View style={styles.signaturesContainer}>
              {signatures.map((sig, index) => (
                <View key={index} style={styles.signatureBox}>
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
            <Text style={styles.certificateNumber}>
              Certificado Nº {data.certificateNumber}
            </Text>
            <Text style={styles.footerText}>
              Emitido em {format(new Date(data.issuedAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </Text>
            <Text style={styles.validationHash}>
              Código de validação: {data.validationHash}
            </Text>
          </View>

          {data.qrCodeBase64 && (
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
  templateType: CertificateTemplateType = 'default',
  signatures?: Array<{ name: string; title: string }>
): Promise<Buffer> => {
  const buffer = await renderToBuffer(
    <CertificateDocument data={data} templateType={templateType} signatures={signatures} />
  )
  return Buffer.from(buffer)
}

export const generateMultipleCertificatesPDF = async (
  certificates: Array<{
    data: CertificateData
    templateType?: CertificateTemplateType
    signatures?: Array<{ name: string; title: string }>
  }>
): Promise<Buffer> => {
  const MultipleCertificatesDocument = () => (
    <Document>
      {certificates.map((cert, index) => {
        const template = templates[cert.templateType || 'default'] || templates.default
        const styles = createStyles(template)
        const bodyText = processBodyTemplate(template.bodyTemplate, cert.data)
        const signatures = cert.signatures || defaultSignatures

        return (
          <Page key={index} size="A4" orientation="landscape" style={styles.page}>
            <View style={styles.border} />
            <View style={styles.innerBorder} />

            <View style={styles.container}>
              <View style={styles.header}>
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

              {signatures.length > 0 && (
                <View style={styles.signaturesContainer}>
                  {signatures.map((sig, sigIndex) => (
                    <View key={sigIndex} style={styles.signatureBox}>
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
                <Text style={styles.certificateNumber}>
                  Certificado Nº {cert.data.certificateNumber}
                </Text>
                <Text style={styles.footerText}>
                  Emitido em {format(new Date(cert.data.issuedAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </Text>
                <Text style={styles.validationHash}>
                  Código de validação: {cert.data.validationHash}
                </Text>
              </View>

              {cert.data.qrCodeBase64 && (
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

// Exporta os tipos de templates disponíveis para uso em outras partes do código
export const availableTemplates: { value: CertificateTemplateType; label: string }[] = [
  { value: 'default', label: 'Padrão' },
  { value: 'course', label: 'Curso' },
  { value: 'event', label: 'Evento' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'seminar', label: 'Seminário' },
]

export type { CertificateData }
