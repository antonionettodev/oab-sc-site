import type { CollectionConfig } from 'payload'

import { nameField } from '@/fields/name'
import { createdByField } from '@/fields/created-by'
import { editedByField } from '@/fields/edited-by'
import { anyone } from '@/access/anyone'
import { trimHook } from '@/hooks/trim'
import { stripNonNumericCharactersHook } from '@/hooks/strip-non-numeric-characters'

export const ExternalParticipants: CollectionConfig = {
  slug: 'external-participants',
  labels: {
    singular: 'Participante Externo',
    plural: 'Participantes Externos',
  },
  admin: {
    useAsTitle: 'name',
    group: 'Eventos',
    defaultColumns: ['name', 'email', 'cpf', 'createdAt'],
    description: 'Participantes que não são advogados (pessoas de fora)',
  },
  access: {
    read: anyone,
  },
  fields: [
    {
      type: 'row',
      fields: [
        nameField({
          required: true,
          width: '50%',
        }),
        {
          name: 'cpf',
          type: 'text',
          label: 'CPF',
          required: true,
          unique: true,
          admin: {
            placeholder: '000.000.000-00',
            width: '50%',
          },
          minLength: 11,
          maxLength: 14,
          hooks: {
            beforeChange: [stripNonNumericCharactersHook],
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
    {
      type: 'row',
      fields: [
        {
          name: 'institution',
          type: 'text',
          label: 'Instituição/Empresa',
          admin: {
            placeholder: 'Nome da instituição ou empresa',
            width: '50%',
          },
          maxLength: 200,
          hooks: {
            beforeChange: [trimHook],
          },
        },
        {
          name: 'profession',
          type: 'text',
          label: 'Profissão',
          admin: {
            placeholder: 'Ex: Contador, Estudante, etc.',
            width: '50%',
          },
          maxLength: 100,
          hooks: {
            beforeChange: [trimHook],
          },
        },
      ],
    },
    createdByField,
    editedByField,
  ],
}
