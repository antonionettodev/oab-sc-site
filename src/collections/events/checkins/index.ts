import type { CollectionConfig } from 'payload'

import { createdByField } from '@/fields/created-by'
import { textareaField } from '@/fields/textarea'
import { anyone } from '@/access/anyone'

export const Checkins: CollectionConfig = {
  slug: 'checkins',
  labels: {
    singular: 'Check-in',
    plural: 'Check-ins',
  },
  admin: {
    useAsTitle: 'id',
    group: 'Eventos',
    defaultColumns: ['event', 'participantName', 'checkinType', 'checkinAt', 'isValid'],
    description: 'Registro de check-ins de eventos',
  },
  access: {
    read: anyone,
  },
  fields: [
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
            placeholder: 'Ingresso (para eventos externos)',
            width: '50%',
          },
        },
        {
          name: 'room',
          type: 'relationship',
          label: 'Sala',
          relationTo: 'event-rooms',
          admin: {
            placeholder: 'Sala (para eventos multi-sala)',
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
                placeholder: 'Nome do participante',
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
      ],
    },
    {
      type: 'group',
      label: 'Informações do Check-in',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'checkinType',
              type: 'select',
              label: 'Tipo de Check-in',
              required: true,
              options: [
                { label: 'QR Code Individual (Externo)', value: 'qr-individual' },
                { label: 'QR Code do Evento (Interno)', value: 'qr-event' },
                { label: 'Manual (Funcionário)', value: 'manual' },
                { label: 'Busca por Nome', value: 'search' },
              ],
              admin: {
                placeholder: 'Selecione o tipo',
                width: '50%',
              },
            },
            {
              name: 'checkinMethod',
              type: 'select',
              label: 'Método de Validação',
              required: true,
              options: [
                { label: 'QR Code', value: 'qr-code' },
                { label: 'Senha do Evento', value: 'password' },
                { label: 'Token', value: 'token' },
                { label: 'Manual', value: 'manual' },
              ],
              admin: {
                placeholder: 'Selecione o método',
                width: '50%',
              },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'checkinAt',
              type: 'date',
              label: 'Data/Hora do Check-in',
              required: true,
              admin: {
                date: {
                  displayFormat: 'dd/MM/yyyy, HH:mm:ss',
                  pickerAppearance: 'dayAndTime',
                },
                width: '50%',
              },
              defaultValue: () => new Date().toISOString(),
            },
            {
              name: 'checkinBy',
              type: 'relationship',
              label: 'Realizado Por',
              relationTo: 'users',
              admin: {
                placeholder: 'Funcionário que realizou (eventos externos)',
                description: 'Funcionário que validou o check-in',
                width: '50%',
              },
            },
          ],
        },
      ],
    },
    {
      type: 'group',
      label: 'Validações',
      admin: {
        description: 'Status das validações do check-in',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'isValid',
              type: 'checkbox',
              label: 'Check-in Válido',
              defaultValue: false,
              admin: {
                description: 'Se o check-in é válido',
                width: '25%',
              },
            },
            {
              name: 'voucherValidated',
              type: 'checkbox',
              label: 'Voucher Validado',
              defaultValue: false,
              admin: {
                description: 'Se o voucher foi validado',
                width: '25%',
              },
            },
            {
              name: 'paymentValidated',
              type: 'checkbox',
              label: 'Pagamento Validado',
              defaultValue: false,
              admin: {
                description: 'Se o pagamento foi verificado',
                width: '25%',
              },
            },
            {
              name: 'presenceConfirmed',
              type: 'checkbox',
              label: 'Presença Confirmada',
              defaultValue: false,
              admin: {
                description: 'Se a presença foi confirmada',
                width: '25%',
              },
            },
          ],
        },
      ],
    },
    {
      type: 'group',
      label: 'Dados da Validação',
      admin: {
        description: 'Dados técnicos da validação',
      },
      fields: [
        {
          name: 'qrCodeData',
          type: 'text',
          label: 'Dados do QR Code',
          admin: {
            description: 'JSON escaneado do QR Code',
          },
        },
        {
          name: 'passwordUsed',
          type: 'text',
          label: 'Senha Utilizada',
          admin: {
            description: 'Senha do evento utilizada (eventos internos)',
          },
        },
        {
          name: 'tokenValidated',
          type: 'text',
          label: 'Token Validado',
          admin: {
            description: 'Token do ingresso validado',
          },
        },
        {
          name: 'ipAddress',
          type: 'text',
          label: 'Endereço IP',
          admin: {
            description: 'IP do dispositivo que realizou o check-in',
          },
        },
        {
          name: 'userAgent',
          type: 'text',
          label: 'User Agent',
          admin: {
            description: 'Informações do navegador/dispositivo',
          },
        },
      ],
    },
    {
      name: 'validationErrors',
      type: 'array',
      label: 'Erros de Validação',
      admin: {
        description: 'Erros encontrados durante a validação',
      },
      fields: [
        {
          name: 'error',
          type: 'text',
          label: 'Erro',
          maxLength: 500,
        },
        {
          name: 'timestamp',
          type: 'date',
          label: 'Data/Hora',
          admin: {
            date: {
              displayFormat: 'dd/MM/yyyy, HH:mm:ss',
              pickerAppearance: 'dayAndTime',
            },
          },
        },
      ],
    },
    textareaField({
      name: 'notes',
      label: 'Observações',
      placeholder: 'Observações sobre este check-in...',
      maxLength: 500,
      required: false,
    }),
    createdByField,
  ],
}
