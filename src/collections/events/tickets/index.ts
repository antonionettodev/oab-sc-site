import type { CollectionConfig } from 'payload'

import { createdByField } from '@/fields/created-by'
import { editedByField } from '@/fields/edited-by'
import { textareaField } from '@/fields/textarea'
import { anyone } from '@/access/anyone'
import { generateSecureToken } from '@/lib/token'
import { generateTicketQRCodeEndpoint, generateTicketPDFEndpoint } from '../endpoints'

export const Tickets: CollectionConfig = {
  slug: 'tickets',
  labels: {
    singular: 'Ingresso',
    plural: 'Ingressos',
  },
  admin: {
    useAsTitle: 'ticketCode',
    group: 'Eventos',
    defaultColumns: ['ticketCode', 'registration', 'participantName', 'status', 'checkedInAt'],
    description: 'Ingressos individuais para eventos externos (com QR Code)',
  },
  access: {
    read: anyone,
  },
  endpoints: [
    generateTicketQRCodeEndpoint,
    generateTicketPDFEndpoint,
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        if (operation === 'create') {
          if (!data.ticketCode) {
            data.ticketCode = `TKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
          }
          if (!data.qrToken) {
            data.qrToken = generateSecureToken(32)
          }
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
          name: 'ticketCode',
          type: 'text',
          label: 'Código do Ingresso',
          unique: true,
          admin: {
            readOnly: true,
            description: 'Código único do ingresso (gerado automaticamente)',
            width: '50%',
          },
        },
        {
          name: 'qrToken',
          type: 'text',
          label: 'Token do QR Code',
          unique: true,
          admin: {
            readOnly: true,
            description: 'Token seguro para validação do QR Code',
            width: '50%',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'registration',
          type: 'relationship',
          label: 'Inscrição',
          relationTo: 'registrations',
          required: true,
          admin: {
            placeholder: 'Selecione a inscrição',
            width: '50%',
          },
        },
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
                width: '50%',
              },
            },
            {
              name: 'lawyer',
              type: 'relationship',
              label: 'Advogado',
              relationTo: 'lawyers',
              admin: {
                placeholder: 'Selecione o advogado',
                width: '50%',
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
                width: '50%',
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
                placeholder: 'Nome completo do participante',
                description: 'Nome que aparecerá no ingresso',
                width: '50%',
              },
              maxLength: 128,
            },
            {
              name: 'participantDocument',
              type: 'text',
              label: 'Documento (CPF ou OAB)',
              required: true,
              admin: {
                placeholder: 'CPF ou número da OAB',
                width: '50%',
              },
              maxLength: 20,
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'participantEmail',
              type: 'email',
              label: 'E-mail',
              admin: {
                placeholder: 'email@exemplo.com',
                width: '50%',
              },
            },
            {
              name: 'participantPhone',
              type: 'text',
              label: 'Telefone',
              admin: {
                placeholder: '(00) 00000-0000',
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
      label: 'Categoria e Valor',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'ticketCategory',
              type: 'text',
              label: 'Categoria do Ingresso',
              admin: {
                placeholder: 'Ex: Advogado, Estudante',
                width: '50%',
              },
              maxLength: 100,
            },
            {
              name: 'ticketPrice',
              type: 'number',
              label: 'Valor Pago (R$)',
              admin: {
                placeholder: 'Ex: 200',
                width: '50%',
              },
              min: 0,
            },
          ],
        },
      ],
    },
    {
      type: 'group',
      label: 'Salas (para eventos multi-sala)',
      admin: {
        description: 'Salas selecionadas pelo participante durante a inscrição',
      },
      fields: [
        {
          name: 'selectedRooms',
          type: 'array',
          label: 'Salas Selecionadas',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'room',
                  type: 'relationship',
                  label: 'Sala',
                  relationTo: 'event-rooms',
                  required: true,
                  admin: {
                    width: '50%',
                  },
                },
                {
                  name: 'scheduleItemId',
                  type: 'text',
                  label: 'ID do Item da Programação',
                  admin: {
                    width: '50%',
                    description: 'Referência ao item da programação da sala',
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'date',
                  type: 'date',
                  label: 'Data',
                  required: true,
                  admin: {
                    date: {
                      displayFormat: 'dd/MM/yyyy',
                      pickerAppearance: 'dayOnly',
                    },
                    width: '33%',
                  },
                },
                {
                  name: 'startTime',
                  type: 'text',
                  label: 'Início',
                  required: true,
                  admin: {
                    placeholder: 'Ex: 09:00',
                    width: '33%',
                  },
                  maxLength: 5,
                },
                {
                  name: 'endTime',
                  type: 'text',
                  label: 'Término',
                  required: true,
                  admin: {
                    placeholder: 'Ex: 10:30',
                    width: '33%',
                  },
                  maxLength: 5,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'group',
      label: 'Status e Check-in',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'status',
              type: 'select',
              label: 'Status',
              defaultValue: 'valid',
              required: true,
              options: [
                { label: 'Válido', value: 'valid' },
                { label: 'Utilizado', value: 'used' },
                { label: 'Cancelado', value: 'cancelled' },
                { label: 'Expirado', value: 'expired' },
              ],
              admin: {
                placeholder: 'Selecione o status',
                width: '50%',
              },
            },
            {
              name: 'paymentStatus',
              type: 'select',
              label: 'Status do Pagamento',
              defaultValue: 'pending',
              required: true,
              options: [
                { label: 'Pendente', value: 'pending' },
                { label: 'Pago', value: 'paid' },
                { label: 'Cortesia', value: 'complimentary' },
                { label: 'Cancelado', value: 'cancelled' },
                { label: 'Reembolsado', value: 'refunded' },
              ],
              admin: {
                placeholder: 'Selecione o status',
                width: '50%',
              },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'checkedInAt',
              type: 'date',
              label: 'Check-in Realizado Em',
              admin: {
                date: {
                  displayFormat: 'dd/MM/yyyy, HH:mm',
                  pickerAppearance: 'dayAndTime',
                },
                description: 'Data e hora do check-in',
                width: '50%',
              },
            },
            {
              name: 'voucherValidated',
              type: 'checkbox',
              label: 'Voucher Validado',
              defaultValue: false,
              admin: {
                description: 'Se o voucher/ingresso foi validado pelo funcionário',
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
      name: 'qrCodeData',
      type: 'text',
      label: 'Dados do QR Code',
      admin: {
        readOnly: true,
        description: 'JSON com dados codificados no QR Code',
      },
    },
    {
      name: 'ticketPrintedAt',
      type: 'date',
      label: 'Ingresso Impresso Em',
      admin: {
        date: {
          displayFormat: 'dd/MM/yyyy, HH:mm',
          pickerAppearance: 'dayAndTime',
        },
        description: 'Data e hora em que o ingresso foi impresso',
        readOnly: true,
      },
    },
    textareaField({
      name: 'notes',
      label: 'Observações',
      placeholder: 'Observações sobre este ingresso...',
      maxLength: 500,
      required: false,
    }),
    createdByField,
    editedByField,
  ],
}
