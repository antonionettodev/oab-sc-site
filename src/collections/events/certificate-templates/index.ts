import type { CollectionConfig } from 'payload'

import { titleField } from '@/fields/title'
import { createdByField } from '@/fields/created-by'
import { editedByField } from '@/fields/edited-by'
import { textareaField } from '@/fields/textarea'
import { anyone } from '@/access/anyone'

export const CertificateTemplates: CollectionConfig = {
  slug: 'certificate-templates',
  labels: {
    singular: 'Modelo de Certificado',
    plural: 'Modelos de Certificado',
  },
  admin: {
    useAsTitle: 'name',
    group: 'Eventos',
    defaultColumns: ['name', 'isDefault', 'status', 'createdAt'],
    description: 'Modelos de layout para certificados de eventos',
  },
  access: {
    read: anyone,
  },
  fields: [
    {
      type: 'row',
      fields: [
        titleField({
          name: 'name',
          label: 'Nome do Modelo',
          placeholder: 'Ex: Certificado Padrão OAB',
          width: '50%',
        }),
        {
          name: 'isDefault',
          type: 'checkbox',
          label: 'Modelo Padrão',
          defaultValue: false,
          admin: {
            description: 'Usar como modelo padrão quando nenhum for especificado',
            width: '25%',
          },
        },
        {
          name: 'status',
          type: 'select',
          label: 'Status',
          defaultValue: 'active',
          required: true,
          options: [
            { label: 'Ativo', value: 'active' },
            { label: 'Inativo', value: 'inactive' },
          ],
          admin: {
            placeholder: 'Selecione o status',
            width: '25%',
          },
        },
      ],
    },
    {
      type: 'group',
      label: 'Design do Certificado',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'orientation',
              type: 'select',
              label: 'Orientação',
              defaultValue: 'landscape',
              required: true,
              options: [
                { label: 'Paisagem', value: 'landscape' },
                { label: 'Retrato', value: 'portrait' },
              ],
              admin: {
                width: '50%',
              },
            },
            {
              name: 'pageSize',
              type: 'select',
              label: 'Tamanho da Página',
              defaultValue: 'A4',
              required: true,
              options: [
                { label: 'A4', value: 'A4' },
                { label: 'Letter', value: 'LETTER' },
              ],
              admin: {
                width: '50%',
              },
            },
          ],
        },
        {
          name: 'backgroundImage',
          type: 'upload',
          label: 'Imagem de Fundo',
          relationTo: 'files',
          admin: {
            description: 'Imagem de fundo do certificado (recomendado: mesma proporção da página)',
          },
        },
        {
          name: 'logo',
          type: 'upload',
          label: 'Logo',
          relationTo: 'files',
          admin: {
            description: 'Logo que aparecerá no certificado',
          },
        },
        {
          type: 'row',
          fields: [
            {
              name: 'primaryColor',
              type: 'text',
              label: 'Cor Primária',
              defaultValue: '#1a365d',
              admin: {
                placeholder: '#1a365d',
                description: 'Cor principal do texto (hexadecimal)',
                width: '33%',
              },
              maxLength: 7,
            },
            {
              name: 'secondaryColor',
              type: 'text',
              label: 'Cor Secundária',
              defaultValue: '#2b6cb0',
              admin: {
                placeholder: '#2b6cb0',
                description: 'Cor secundária (hexadecimal)',
                width: '33%',
              },
              maxLength: 7,
            },
            {
              name: 'accentColor',
              type: 'text',
              label: 'Cor de Destaque',
              defaultValue: '#c9a227',
              admin: {
                placeholder: '#c9a227',
                description: 'Cor de destaque/bordas (hexadecimal)',
                width: '33%',
              },
              maxLength: 7,
            },
          ],
        },
      ],
    },
    {
      type: 'group',
      label: 'Conteúdo do Certificado',
      fields: [
        {
          name: 'headerText',
          type: 'text',
          label: 'Texto do Cabeçalho',
          defaultValue: 'ORDEM DOS ADVOGADOS DO BRASIL - SECCIONAL SANTA CATARINA',
          admin: {
            placeholder: 'Texto que aparece no topo do certificado',
          },
          maxLength: 200,
        },
        {
          name: 'titleText',
          type: 'text',
          label: 'Título',
          defaultValue: 'CERTIFICADO',
          admin: {
            placeholder: 'Ex: CERTIFICADO, CERTIFICADO DE PARTICIPAÇÃO',
          },
          maxLength: 100,
        },
        textareaField({
          name: 'bodyTemplate',
          label: 'Modelo do Corpo',
          placeholder: 'Use {{participantName}}, {{eventTitle}}, {{eventDate}}, {{workload}} como variáveis',
          description: 'Texto principal do certificado. Variáveis disponíveis: {{participantName}}, {{eventTitle}}, {{eventDate}}, {{startDate}}, {{endDate}}, {{workload}}, {{certificateNumber}}',
          maxLength: 2000,
          required: true,
        }),
        {
          name: 'footerText',
          type: 'text',
          label: 'Texto do Rodapé',
          admin: {
            placeholder: 'Texto que aparece no rodapé do certificado',
          },
          maxLength: 300,
        },
      ],
    },
    {
      type: 'group',
      label: 'Assinaturas',
      admin: {
        description: 'Configure as assinaturas que aparecerão no certificado',
      },
      fields: [
        {
          name: 'signatures',
          type: 'array',
          label: 'Assinaturas',
          maxRows: 3,
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'name',
                  type: 'text',
                  label: 'Nome',
                  required: true,
                  admin: {
                    placeholder: 'Nome do assinante',
                    width: '50%',
                  },
                  maxLength: 128,
                },
                {
                  name: 'title',
                  type: 'text',
                  label: 'Cargo',
                  required: true,
                  admin: {
                    placeholder: 'Ex: Presidente da OAB/SC',
                    width: '50%',
                  },
                  maxLength: 128,
                },
              ],
            },
            {
              name: 'signatureImage',
              type: 'upload',
              label: 'Imagem da Assinatura',
              relationTo: 'files',
              admin: {
                description: 'Imagem da assinatura (opcional, fundo transparente recomendado)',
              },
            },
          ],
        },
      ],
    },
    {
      name: 'showQRCode',
      type: 'checkbox',
      label: 'Exibir QR Code de Validação',
      defaultValue: true,
      admin: {
        description: 'Incluir QR Code para validação online do certificado',
      },
    },
    {
      name: 'validationUrl',
      type: 'text',
      label: 'URL de Validação',
      admin: {
        placeholder: 'https://oabsc.org.br/certificados/validar',
        description: 'URL base para validação de certificados',
      },
      maxLength: 300,
    },
    createdByField,
    editedByField,
  ],
}
