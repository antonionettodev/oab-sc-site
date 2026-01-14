import type { CollectionConfig } from 'payload'

import { createdByField } from '@/fields/created-by'
import { editedByField } from '@/fields/edited-by'
import { textareaField } from '@/fields/textarea'
import { anyone } from '@/access/anyone'
import { trimHook } from '@/hooks/trim'
import {
  checkinExternalEndpoint,
  checkinInternalEndpoint,
  searchTicketEndpoint,
  validateRegistrationEndpoint,
  issueCertificateEndpoint,
} from '../endpoints'

export const Registrations: CollectionConfig = {
  slug: 'registrations',
  labels: {
    singular: 'Inscrição',
    plural: 'Lista de Inscritos',
  },
  admin: {
    useAsTitle: 'registrationCode',
    group: 'Eventos',
    defaultColumns: ['registrationCode', 'event', 'registrantName', 'paymentStatus', 'status', 'registrationDate'],
    description: 'Inscrições de participantes em eventos',
  },
  access: {
    read: anyone,
  },
  endpoints: [
    checkinExternalEndpoint,
    checkinInternalEndpoint,
    searchTicketEndpoint,
    validateRegistrationEndpoint,
    issueCertificateEndpoint,
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        if (operation === 'create') {
          if (!data.registrationCode) {
            const timestamp = Date.now().toString(36).toUpperCase()
            const random = Math.random().toString(36).substring(2, 6).toUpperCase()
            data.registrationCode = `REG-${timestamp}-${random}`
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
          name: 'registrationCode',
          type: 'text',
          label: 'Código da Inscrição',
          unique: true,
          admin: {
            readOnly: true,
            description: 'Código único da inscrição (gerado automaticamente)',
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
      label: 'Dados do Inscrito',
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
              name: 'registrantName',
              type: 'text',
              label: 'Nome Completo',
              required: true,
              admin: {
                placeholder: 'Nome completo do inscrito',
                width: '50%',
              },
              maxLength: 128,
              hooks: {
                beforeChange: [trimHook],
              },
            },
            {
              name: 'registrantDocument',
              type: 'text',
              label: 'Documento (CPF ou OAB)',
              required: true,
              admin: {
                placeholder: 'CPF ou número da OAB',
                width: '50%',
              },
              maxLength: 20,
              hooks: {
                beforeChange: [trimHook],
              },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'email',
              type: 'email',
              label: 'E-mail',
              required: true,
              admin: {
                placeholder: 'email@exemplo.com',
                width: '50%',
              },
            },
            {
              name: 'phone',
              type: 'text',
              label: 'Telefone',
              required: true,
              admin: {
                placeholder: '(00) 00000-0000',
                width: '50%',
              },
              maxLength: 20,
              hooks: {
                beforeChange: [trimHook],
              },
            },
          ],
        },
      ],
    },
    {
      type: 'group',
      label: 'Tipo de Inscrição e Valor',
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
              hooks: {
                beforeChange: [trimHook],
              },
            },
            {
              name: 'ticketPrice',
              type: 'number',
              label: 'Valor Original (R$)',
              admin: {
                placeholder: 'Ex: 200',
                width: '50%',
              },
              min: 0,
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'discountPercent',
              type: 'number',
              label: 'Desconto (%)',
              admin: {
                placeholder: 'Ex: 10',
                width: '33%',
              },
              min: 0,
              max: 100,
            },
            {
              name: 'discountAmount',
              type: 'number',
              label: 'Valor do Desconto (R$)',
              admin: {
                placeholder: 'Ex: 20',
                width: '33%',
              },
              min: 0,
            },
            {
              name: 'totalPrice',
              type: 'number',
              label: 'Valor Final (R$)',
              admin: {
                placeholder: 'Ex: 180',
                width: '33%',
              },
              min: 0,
            },
          ],
        },
        {
          name: 'groupDiscountApplied',
          type: 'checkbox',
          label: 'Desconto de Grupo Aplicado',
          defaultValue: false,
        },
      ],
    },
    {
      type: 'group',
      label: 'Salas Selecionadas (Eventos Multi-sala)',
      admin: {
        description: 'Salas escolhidas pelo participante durante a inscrição',
      },
      fields: [
        {
          name: 'selectedRooms',
          type: 'array',
          label: 'Salas',
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
      label: 'Pagamento',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'paymentStatus',
              type: 'select',
              label: 'Status do Pagamento',
              defaultValue: 'pending',
              required: true,
              options: [
                { label: 'Pendente', value: 'pending' },
                { label: 'Processando', value: 'processing' },
                { label: 'Pago', value: 'paid' },
                { label: 'Falhou', value: 'failed' },
                { label: 'Reembolsado', value: 'refunded' },
                { label: 'Cancelado', value: 'cancelled' },
                { label: 'Cortesia', value: 'complimentary' },
              ],
              admin: {
                placeholder: 'Selecione o status',
                width: '50%',
              },
            },
            {
              name: 'paymentMethod',
              type: 'select',
              label: 'Método de Pagamento',
              options: [
                { label: 'Boleto', value: 'boleto' },
                { label: 'Cartão de Crédito', value: 'credit-card' },
                { label: 'Cartão de Débito', value: 'debit-card' },
                { label: 'PIX', value: 'pix' },
                { label: 'Transferência', value: 'transfer' },
                { label: 'Cortesia', value: 'complimentary' },
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
              name: 'paymentDate',
              type: 'date',
              label: 'Data do Pagamento',
              admin: {
                date: {
                  displayFormat: 'dd/MM/yyyy, HH:mm',
                  pickerAppearance: 'dayAndTime',
                },
                width: '50%',
              },
            },
            {
              name: 'paymentReference',
              type: 'text',
              label: 'Referência do Pagamento',
              admin: {
                placeholder: 'ID da transação, número do boleto, etc.',
                width: '50%',
              },
              maxLength: 200,
            },
          ],
        },
      ],
    },
    {
      type: 'group',
      label: 'Status da Inscrição',
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
                { label: 'Confirmada', value: 'confirmed' },
                { label: 'Check-in Parcial', value: 'partial-checkin' },
                { label: 'Check-in Completo', value: 'checked-in' },
                { label: 'Presente', value: 'attended' },
                { label: 'Ausente', value: 'absent' },
                { label: 'Cancelada', value: 'cancelled' },
              ],
              admin: {
                placeholder: 'Selecione o status',
                width: '50%',
              },
            },
            {
              name: 'registrationDate',
              type: 'date',
              label: 'Data de Inscrição',
              admin: {
                date: {
                  displayFormat: 'dd/MM/yyyy, HH:mm',
                  pickerAppearance: 'dayAndTime',
                },
                width: '50%',
              },
              defaultValue: () => new Date().toISOString(),
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'checkInAt',
              type: 'date',
              label: 'Check-in Realizado Em',
              admin: {
                date: {
                  displayFormat: 'dd/MM/yyyy, HH:mm',
                  pickerAppearance: 'dayAndTime',
                },
                description: 'Data e hora do primeiro check-in',
                readOnly: true,
                width: '50%',
              },
            },
            {
              name: 'presenceConfirmedAt',
              type: 'date',
              label: 'Presença Confirmada Em',
              admin: {
                date: {
                  displayFormat: 'dd/MM/yyyy, HH:mm',
                  pickerAppearance: 'dayAndTime',
                },
                description: 'Data e hora da confirmação de presença',
                readOnly: true,
                width: '50%',
              },
            },
          ],
        },
      ],
    },
    {
      type: 'group',
      label: 'Certificado',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'certificateEligible',
              type: 'checkbox',
              label: 'Elegível para Certificado',
              defaultValue: false,
              admin: {
                description: 'Automaticamente marcado quando inscrição válida + presença confirmada',
                width: '33%',
              },
            },
            {
              name: 'certificateIssued',
              type: 'checkbox',
              label: 'Certificado Emitido',
              defaultValue: false,
              admin: {
                width: '33%',
              },
            },
            {
              name: 'certificate',
              type: 'relationship',
              label: 'Certificado',
              relationTo: 'certificates',
              admin: {
                placeholder: 'Certificado emitido',
                width: '33%',
              },
            },
          ],
        },
      ],
    },
    textareaField({
      name: 'notes',
      label: 'Observações',
      placeholder: 'Adicione observações sobre esta inscrição...',
      maxLength: 500,
      required: false,
    }),
    textareaField({
      name: 'adminNotes',
      label: 'Notas Administrativas',
      placeholder: 'Notas internas (não visíveis para o participante)...',
      maxLength: 500,
      required: false,
    }),
    createdByField,
    editedByField,
  ],
}
