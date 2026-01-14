import type { CollectionConfig } from 'payload'

import { createdByField } from '@/fields/created-by'
import { textareaField } from '@/fields/textarea'
import { anyone } from '@/access/anyone'
import { generateCertificateNumber, generateCertificateHash } from '@/lib/token'
import { generateCertificatePDFEndpoint, validateCertificateEndpoint } from '../endpoints'

export const Certificates: CollectionConfig = {
  slug: 'certificates',
  labels: {
    singular: 'Certificado',
    plural: 'Certificados',
  },
  admin: {
    useAsTitle: 'certificateNumber',
    group: 'Eventos',
    defaultColumns: ['certificateNumber', 'participantName', 'event', 'status', 'issuedAt'],
    description: 'Certificados emitidos para participantes de eventos',
  },
  access: {
    read: anyone,
  },
  endpoints: [
    generateCertificatePDFEndpoint,
    validateCertificateEndpoint,
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation === 'create') {
          const payload = req.payload
          const year = new Date().getFullYear()

          const existingCerts = await payload.find({
            collection: 'certificates',
            where: {
              certificateNumber: {
                contains: `CERT-${year}-${data.event}`,
              },
            },
            sort: '-createdAt',
            limit: 1,
          })

          let sequence = 1
          if (existingCerts.docs.length > 0) {
            const lastCert = existingCerts.docs[0]
            const lastNumber = lastCert.certificateNumber as string
            const parts = lastNumber.split('-')
            sequence = parseInt(parts[parts.length - 1], 10) + 1
          }

          data.certificateNumber = generateCertificateNumber({
            eventId: data.event,
            year,
            sequence,
          })

          data.validationHash = generateCertificateHash({
            certificateNumber: data.certificateNumber,
            participantName: data.participantName,
            eventTitle: data.eventTitle || '',
          })
        }
        return data
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'certificateNumber',
          type: 'text',
          label: 'Número do Certificado',
          unique: true,
          admin: {
            readOnly: true,
            description: 'Número único do certificado (gerado automaticamente)',
            width: '50%',
          },
        },
        {
          name: 'validationHash',
          type: 'text',
          label: 'Hash de Validação',
          unique: true,
          admin: {
            readOnly: true,
            description: 'Hash para validação do certificado',
            width: '50%',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'event',
          type: 'relationship',
          label: 'Evento',
          relationTo: 'events',
          required: true,
          admin: {
            placeholder: 'Selecione o evento',
            width: '50%',
          },
        },
        {
          name: 'registration',
          type: 'relationship',
          label: 'Inscrição',
          relationTo: 'registrations',
          admin: {
            placeholder: 'Selecione a inscrição',
            width: '50%',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'ticket',
          type: 'relationship',
          label: 'Ingresso',
          relationTo: 'tickets',
          admin: {
            placeholder: 'Ingresso relacionado',
            width: '50%',
          },
        },
        {
          name: 'template',
          type: 'relationship',
          label: 'Modelo de Certificado',
          relationTo: 'certificate-templates',
          admin: {
            placeholder: 'Modelo usado para gerar o certificado',
            width: '50%',
          },
        },
      ],
    },
    {
      type: 'group',
      label: 'Dados do Participante',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'participantType',
              type: 'select',
              label: 'Tipo de Participante',
              required: true,
              defaultValue: 'lawyer',
              options: [
                { label: 'Advogado', value: 'lawyer' },
                { label: 'Participante Externo', value: 'external' },
              ],
              admin: {
                width: '33%',
              },
            },
            {
              name: 'lawyer',
              type: 'relationship',
              label: 'Advogado',
              relationTo: 'lawyers',
              admin: {
                placeholder: 'Selecione o advogado',
                width: '33%',
                condition: (data, siblingData) => siblingData?.participantType === 'lawyer',
              },
            },
            {
              name: 'externalParticipant',
              type: 'relationship',
              label: 'Participante Externo',
              relationTo: 'external-participants',
              admin: {
                placeholder: 'Selecione o participante',
                width: '33%',
                condition: (data, siblingData) => siblingData?.participantType === 'external',
              },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'participantName',
              type: 'text',
              label: 'Nome do Participante',
              required: true,
              admin: {
                placeholder: 'Nome completo que aparecerá no certificado',
                width: '50%',
              },
              maxLength: 128,
            },
            {
              name: 'participantDocument',
              type: 'text',
              label: 'Documento',
              admin: {
                placeholder: 'CPF ou OAB',
                width: '50%',
              },
              maxLength: 20,
            },
          ],
        },
        {
          name: 'participantEmail',
          type: 'email',
          label: 'E-mail do Participante',
          admin: {
            placeholder: 'email@exemplo.com',
          },
        },
      ],
    },
    {
      type: 'group',
      label: 'Dados do Evento (para o Certificado)',
      admin: {
        description: 'Dados que serão exibidos no certificado',
      },
      fields: [
        {
          name: 'eventTitle',
          type: 'text',
          label: 'Título do Evento',
          required: true,
          admin: {
            placeholder: 'Título que aparecerá no certificado',
          },
          maxLength: 256,
        },
        {
          type: 'row',
          fields: [
            {
              name: 'eventStartDate',
              type: 'date',
              label: 'Data de Início',
              admin: {
                date: {
                  displayFormat: 'dd/MM/yyyy',
                  pickerAppearance: 'dayOnly',
                },
                width: '33%',
              },
            },
            {
              name: 'eventEndDate',
              type: 'date',
              label: 'Data de Término',
              admin: {
                date: {
                  displayFormat: 'dd/MM/yyyy',
                  pickerAppearance: 'dayOnly',
                },
                width: '33%',
              },
            },
            {
              name: 'workload',
              type: 'text',
              label: 'Carga Horária',
              admin: {
                placeholder: 'Ex: 8 horas',
                width: '33%',
              },
              maxLength: 50,
            },
          ],
        },
      ],
    },
    {
      type: 'group',
      label: 'Status e Emissão',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'status',
              type: 'select',
              label: 'Status',
              defaultValue: 'pending',
              required: true,
              options: [
                { label: 'Pendente', value: 'pending' },
                { label: 'Gerado', value: 'generated' },
                { label: 'Enviado', value: 'sent' },
                { label: 'Erro', value: 'error' },
                { label: 'Revogado', value: 'revoked' },
              ],
              admin: {
                placeholder: 'Selecione o status',
                width: '50%',
              },
            },
            {
              name: 'issuedAt',
              type: 'date',
              label: 'Emitido Em',
              admin: {
                date: {
                  displayFormat: 'dd/MM/yyyy, HH:mm',
                  pickerAppearance: 'dayAndTime',
                },
                width: '50%',
              },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'sentAt',
              type: 'date',
              label: 'Enviado Em',
              admin: {
                date: {
                  displayFormat: 'dd/MM/yyyy, HH:mm',
                  pickerAppearance: 'dayAndTime',
                },
                width: '50%',
              },
            },
            {
              name: 'downloadCount',
              type: 'number',
              label: 'Downloads',
              defaultValue: 0,
              admin: {
                readOnly: true,
                description: 'Quantidade de vezes que o certificado foi baixado',
                width: '50%',
              },
            },
          ],
        },
        {
          name: 'lastDownloadAt',
          type: 'date',
          label: 'Último Download Em',
          admin: {
            date: {
              displayFormat: 'dd/MM/yyyy, HH:mm',
              pickerAppearance: 'dayAndTime',
            },
            readOnly: true,
          },
        },
      ],
    },
    {
      type: 'group',
      label: 'Arquivo do Certificado',
      fields: [
        {
          name: 'pdfFile',
          type: 'upload',
          label: 'Arquivo PDF',
          relationTo: 'files',
          admin: {
            description: 'PDF do certificado gerado',
          },
        },
        {
          name: 'validationQrCode',
          type: 'text',
          label: 'QR Code de Validação (Base64)',
          admin: {
            description: 'QR Code em base64 para validação online',
          },
        },
      ],
    },
    {
      type: 'group',
      label: 'Duplicatas e Revogação',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'isDuplicate',
              type: 'checkbox',
              label: 'É Segunda Via',
              defaultValue: false,
              admin: {
                width: '25%',
              },
            },
            {
              name: 'originalCertificate',
              type: 'relationship',
              label: 'Certificado Original',
              relationTo: 'certificates',
              admin: {
                placeholder: 'Certificado original (se segunda via)',
                width: '75%',
                condition: (data, siblingData) => siblingData?.isDuplicate === true,
              },
            },
          ],
        },
        {
          name: 'revokedAt',
          type: 'date',
          label: 'Revogado Em',
          admin: {
            date: {
              displayFormat: 'dd/MM/yyyy, HH:mm',
              pickerAppearance: 'dayAndTime',
            },
            condition: (data) => data?.status === 'revoked',
          },
        },
        {
          name: 'revokedReason',
          type: 'textarea',
          label: 'Motivo da Revogação',
          admin: {
            condition: (data) => data?.status === 'revoked',
          },
          maxLength: 500,
        },
      ],
    },
    {
      name: 'errorMessage',
      type: 'text',
      label: 'Mensagem de Erro',
      admin: {
        description: 'Mensagem de erro caso a geração tenha falhado',
        condition: (data) => data?.status === 'error',
      },
      maxLength: 500,
    },
    textareaField({
      name: 'notes',
      label: 'Observações',
      placeholder: 'Observações sobre este certificado...',
      maxLength: 500,
      required: false,
    }),
    createdByField,
  ],
}
