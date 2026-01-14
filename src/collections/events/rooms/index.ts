import type { CollectionConfig } from 'payload'

import { titleField } from '@/fields/title'
import { createdByField } from '@/fields/created-by'
import { editedByField } from '@/fields/edited-by'
import { textareaField } from '@/fields/textarea'
import { anyone } from '@/access/anyone'
import { trimHook } from '@/hooks/trim'

export const EventRooms: CollectionConfig = {
  slug: 'event-rooms',
  labels: {
    singular: 'Sala de Evento',
    plural: 'Salas de Eventos',
  },
  admin: {
    useAsTitle: 'name',
    group: 'Eventos',
    defaultColumns: ['name', 'event', 'capacity', 'status'],
    description: 'Salas para eventos com múltiplas salas (conferências)',
  },
  access: {
    read: anyone,
  },
  fields: [
    {
      name: 'event',
      type: 'relationship',
      label: 'Evento',
      relationTo: 'events',
      required: true,
      admin: {
        placeholder: 'Selecione o evento',
      },
    },
    {
      type: 'row',
      fields: [
        titleField({
          name: 'name',
          label: 'Nome da Sala',
          placeholder: 'Ex: Sala A - Direito Digital',
          width: '50%',
        }),
        {
          name: 'capacity',
          type: 'number',
          label: 'Capacidade',
          required: true,
          admin: {
            placeholder: 'Ex: 50',
            description: 'Número máximo de participantes',
            width: '50%',
          },
          min: 1,
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'location',
          type: 'text',
          label: 'Localização',
          admin: {
            placeholder: 'Ex: 2º andar, Bloco B',
            width: '50%',
          },
          maxLength: 200,
          hooks: {
            beforeChange: [trimHook],
          },
        },
        {
          name: 'status',
          type: 'select',
          label: 'Status',
          defaultValue: 'active',
          required: true,
          options: [
            { label: 'Ativa', value: 'active' },
            { label: 'Inativa', value: 'inactive' },
            { label: 'Lotada', value: 'full' },
          ],
          admin: {
            placeholder: 'Selecione o status',
            width: '50%',
          },
        },
      ],
    },
    textareaField({
      name: 'description',
      label: 'Descrição',
      placeholder: 'Descrição ou observações sobre a sala...',
      maxLength: 500,
      required: false,
    }),
    {
      name: 'schedule',
      type: 'array',
      label: 'Programação da Sala',
      admin: {
        description: 'Adicione a programação específica desta sala',
      },
      fields: [
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
              hooks: {
                beforeChange: [trimHook],
              },
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
              hooks: {
                beforeChange: [trimHook],
              },
            },
          ],
        },
        titleField({
          name: 'title',
          label: 'Título da Atividade',
          placeholder: 'Ex: Palestra sobre LGPD',
          width: '100%',
        }),
        textareaField({
          name: 'description',
          label: 'Descrição',
          placeholder: 'Descrição da atividade...',
          maxLength: 500,
          required: false,
        }),
        {
          name: 'speaker',
          type: 'relationship',
          label: 'Palestrante',
          relationTo: 'speakers',
          admin: {
            placeholder: 'Selecione o palestrante (opcional)',
          },
        },
      ],
    },
    createdByField,
    editedByField,
  ],
}
