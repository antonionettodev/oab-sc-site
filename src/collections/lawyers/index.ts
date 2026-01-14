import type { CollectionConfig } from 'payload'

import { createdByField } from '@/fields/created-by'
import { editedByField } from '@/fields/edited-by'
import { trimUppercaseHook } from '@/hooks/trim-uppercase'
import { brConselhosStrategy } from './strategies/brconselhos-strategy'
import { loginBRConselhosEndpoint, syncBRConselhosEndpoint } from './endpoints/login-brconselhos'

export const Lawyers: CollectionConfig = {
  slug: 'lawyers',
  labels: {
    singular: 'Advogado',
    plural: 'Advogados',
  },
  admin: {
    useAsTitle: 'name',
    group: 'Gestão de Pessoas',
    defaultColumns: ['name', 'oabNumber', 'cpf', 'situacaoAtual', 'email'],
  },
  auth: {
    disableLocalStrategy: true,
    tokenExpiration: 60 * 60 * 24 * 7, // 7 days
    strategies: [brConselhosStrategy],
  },
  endpoints: [loginBRConselhosEndpoint, syncBRConselhosEndpoint],
  fields: [
    {
      type: 'tabs',
      tabs: [
        // Tab 1: Identificação
        {
          label: 'Identificação',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'name',
                  type: 'text',
                  label: 'Nome Completo',
                  required: true,
                  admin: {
                    placeholder: 'Nome completo do advogado',
                    width: '50%',
                  },
                },
                {
                  name: 'oabNumber',
                  type: 'text',
                  label: 'Nº OAB',
                  unique: true,
                  index: true,
                  saveToJWT: true,
                  admin: {
                    placeholder: 'Número de registro na OAB',
                    width: '25%',
                  },
                  hooks: {
                    beforeChange: [trimUppercaseHook],
                  },
                },
                {
                  name: 'oabNumberTemp',
                  type: 'text',
                  label: 'Nº OAB Temporário',
                  admin: {
                    placeholder: 'Registro temporário',
                    width: '25%',
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'cpf',
                  type: 'text',
                  label: 'CPF',
                  unique: true,
                  index: true,
                  admin: {
                    placeholder: '000.000.000-00',
                    width: '25%',
                  },
                },
                {
                  name: 'rg',
                  type: 'text',
                  label: 'RG',
                  admin: {
                    placeholder: 'Número do RG',
                    width: '25%',
                  },
                },
                {
                  name: 'rgOrgaoEmissor',
                  type: 'text',
                  label: 'Órgão Emissor',
                  admin: {
                    placeholder: 'Ex: SSP',
                    width: '25%',
                  },
                },
                {
                  name: 'rgDataEmissao',
                  type: 'date',
                  label: 'Data Emissão RG',
                  admin: {
                    date: {
                      pickerAppearance: 'dayOnly',
                      displayFormat: 'dd/MM/yyyy',
                    },
                    width: '25%',
                  },
                },
              ],
            },
          ],
        },
        // Tab 2: Dados Pessoais
        {
          label: 'Dados Pessoais',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'dataNascimento',
                  type: 'date',
                  label: 'Data de Nascimento',
                  admin: {
                    date: {
                      pickerAppearance: 'dayOnly',
                      displayFormat: 'dd/MM/yyyy',
                    },
                    width: '25%',
                  },
                },
                {
                  name: 'estadoCivil',
                  type: 'text',
                  label: 'Estado Civil',
                  admin: {
                    placeholder: 'Ex: Solteiro, Casado',
                    width: '25%',
                  },
                },
                {
                  name: 'nomeMae',
                  type: 'text',
                  label: 'Nome da Mãe',
                  admin: {
                    placeholder: 'Nome completo da mãe',
                    width: '25%',
                  },
                },
                {
                  name: 'nomePai',
                  type: 'text',
                  label: 'Nome do Pai',
                  admin: {
                    placeholder: 'Nome completo do pai',
                    width: '25%',
                  },
                },
              ],
            },
          ],
        },
        // Tab 3: Contato
        {
          label: 'Contato',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'email',
                  type: 'email',
                  label: 'E-mail',
                  admin: {
                    placeholder: 'email@exemplo.com',
                    width: '50%',
                  },
                },
                {
                  name: 'telefone',
                  type: 'text',
                  label: 'Telefone',
                  admin: {
                    placeholder: '(00) 0000-0000',
                    width: '25%',
                  },
                },
                {
                  name: 'telefone2',
                  type: 'text',
                  label: 'Telefone 2',
                  admin: {
                    placeholder: '(00) 0000-0000',
                    width: '25%',
                  },
                },
              ],
            },
          ],
        },
        // Tab 4: Endereço
        {
          label: 'Endereço',
          fields: [
            {
              name: 'endereco',
              type: 'group',
              label: '',
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'cep',
                      type: 'text',
                      label: 'CEP',
                      admin: {
                        placeholder: '00000-000',
                        width: '20%',
                      },
                    },
                    {
                      name: 'logradouro',
                      type: 'text',
                      label: 'Logradouro',
                      admin: {
                        placeholder: 'Rua, Avenida, etc.',
                        width: '50%',
                      },
                    },
                    {
                      name: 'numero',
                      type: 'text',
                      label: 'Número',
                      admin: {
                        placeholder: 'Nº',
                        width: '15%',
                      },
                    },
                    {
                      name: 'complemento',
                      type: 'text',
                      label: 'Complemento',
                      admin: {
                        placeholder: 'Apto, Sala, etc.',
                        width: '15%',
                      },
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'bairro',
                      type: 'text',
                      label: 'Bairro',
                      admin: {
                        placeholder: 'Bairro',
                        width: '30%',
                      },
                    },
                    {
                      name: 'municipio',
                      type: 'text',
                      label: 'Município',
                      admin: {
                        placeholder: 'Cidade',
                        width: '30%',
                      },
                    },
                    {
                      name: 'estado',
                      type: 'text',
                      label: 'Estado',
                      admin: {
                        placeholder: 'UF',
                        width: '20%',
                      },
                    },
                    {
                      name: 'pais',
                      type: 'text',
                      label: 'País',
                      defaultValue: 'Brasil',
                      admin: {
                        placeholder: 'País',
                        width: '20%',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        // Tab 5: Status OAB
        {
          label: 'Status OAB',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'subUnidade',
                  type: 'text',
                  label: 'Subunidade OAB',
                  saveToJWT: true,
                  admin: {
                    placeholder: 'Ex: OAB/SC',
                    width: '25%',
                  },
                },
                {
                  name: 'situacaoAtual',
                  type: 'select',
                  label: 'Situação Atual',
                  defaultValue: 'ativo',
                  saveToJWT: true,
                  options: [
                    { label: 'Ativo', value: 'ativo' },
                    { label: 'Inativo', value: 'inativo' },
                    { label: 'Suspenso', value: 'suspenso' },
                    { label: 'Licenciado', value: 'licenciado' },
                    { label: 'Cancelado', value: 'cancelado' },
                  ],
                  admin: {
                    width: '25%',
                  },
                },
                {
                  name: 'inadimplente',
                  type: 'checkbox',
                  label: 'Inadimplente',
                  defaultValue: false,
                  saveToJWT: true,
                  admin: {
                    width: '25%',
                  },
                },
                {
                  name: 'jovemAdvogado',
                  type: 'checkbox',
                  label: 'Jovem Advogado',
                  defaultValue: false,
                  admin: {
                    width: '25%',
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'dataAcordao',
                  type: 'date',
                  label: 'Data Acórdão',
                  admin: {
                    description: 'Data de inscrição definitiva na OAB',
                    date: {
                      pickerAppearance: 'dayOnly',
                      displayFormat: 'dd/MM/yyyy',
                    },
                    width: '50%',
                  },
                },
                {
                  name: 'dataAcordaoEstagiario',
                  type: 'date',
                  label: 'Data Acórdão Estagiário',
                  admin: {
                    description: 'Data de inscrição como estagiário',
                    date: {
                      pickerAppearance: 'dayOnly',
                      displayFormat: 'dd/MM/yyyy',
                    },
                    width: '50%',
                  },
                },
              ],
            },
          ],
        },
        // Tab 6: Integração BR Conselhos
        {
          label: 'BR Conselhos',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'brConselhosLoginUser',
                  type: 'text',
                  label: 'Login BR Conselhos',
                  unique: true,
                  index: true,
                  admin: {
                    description: 'ID de usuário no sistema BR Conselhos',
                    readOnly: true,
                    width: '50%',
                  },
                },
                {
                  name: 'brConselhosLastSync',
                  type: 'date',
                  label: 'Última Sincronização',
                  admin: {
                    description: 'Data da última sincronização com BR Conselhos',
                    date: {
                      pickerAppearance: 'dayAndTime',
                      displayFormat: 'dd/MM/yyyy HH:mm',
                    },
                    readOnly: true,
                    width: '50%',
                  },
                },
              ],
            },
            {
              type: 'ui',
              name: 'brConselhosInfo',
              admin: {
                components: {
                  Field: {
                    path: '@/components/admin/brconselhos-info',
                  },
                },
              },
            },
          ],
        },
      ],
    },
    createdByField,
    editedByField,
  ],
}
