import type { AuthStrategy } from 'payload'
import {
  authenticateBRConselhos,
  parseBrazilianDate,
  cleanCpfCnpj,
  type BRConselhosLawyerData,
} from '@/lib/services/brconselhos'

/**
 * Mapeia situação do BR Conselhos para o select do Payload
 */
function mapSituacaoAtual(situacao?: string): string {
  if (!situacao) return 'ativo'

  const situacaoLower = situacao.toLowerCase()

  if (situacaoLower.includes('ativo')) return 'ativo'
  if (situacaoLower.includes('inativo')) return 'inativo'
  if (situacaoLower.includes('suspenso')) return 'suspenso'
  if (situacaoLower.includes('licenciado')) return 'licenciado'
  if (situacaoLower.includes('cancelado')) return 'cancelado'

  return 'ativo'
}

/**
 * Mapeia valor sim/não para boolean
 */
function mapYesNo(value?: string): boolean {
  if (!value) return false
  return value.toLowerCase() === 'sim'
}

/**
 * Prepara dados do advogado para criar/atualizar no Payload
 */
function prepareLawyerData(brData: BRConselhosLawyerData): Record<string, unknown> {
  const data: Record<string, unknown> = {
    brConselhosLastSync: new Date().toISOString(),
  }

  if (brData.nome) data.name = brData.nome
  if (brData.registroConselho) data.oabNumber = brData.registroConselho
  if (brData.registroConselhoTemporario) data.oabNumberTemp = brData.registroConselhoTemporario
  if (brData.cpfCnpj) data.cpf = cleanCpfCnpj(brData.cpfCnpj)
  if (brData.rg) data.rg = brData.rg
  if (brData.orgaoEmissorRG) data.rgOrgaoEmissor = brData.orgaoEmissorRG
  if (brData.dataEmissaoRG) data.rgDataEmissao = parseBrazilianDate(brData.dataEmissaoRG)
  if (brData.dataNascimentoFundacao) data.dataNascimento = parseBrazilianDate(brData.dataNascimentoFundacao)
  if (brData.estadoCivil) data.estadoCivil = brData.estadoCivil
  if (brData.nomeMae) data.nomeMae = brData.nomeMae
  if (brData.nomePai) data.nomePai = brData.nomePai
  if (brData.emailComercial) data.email = brData.emailComercial.toLowerCase()
  if (brData.telefoneComercial) data.telefone = brData.telefoneComercial
  if (brData.telefone2Comercial) data.telefone2 = brData.telefone2Comercial
  if (brData.subUnidade) data.subUnidade = brData.subUnidade
  if (brData.situacaoAtual) data.situacaoAtual = mapSituacaoAtual(brData.situacaoAtual)
  if (brData.inadimplente) data.inadimplente = mapYesNo(brData.inadimplente)
  if (brData.jovemAdvogado) data.jovemAdvogado = mapYesNo(brData.jovemAdvogado)
  if (brData.dataAcordao) data.dataAcordao = parseBrazilianDate(brData.dataAcordao)
  if (brData.dataAcordaoEstagiario) data.dataAcordaoEstagiario = parseBrazilianDate(brData.dataAcordaoEstagiario)
  if (brData.loginUser) data.brConselhosLoginUser = brData.loginUser

  // Endereço
  const endereco: Record<string, string> = {}
  if (brData.cep) endereco.cep = brData.cep
  if (brData.logradouro) endereco.logradouro = brData.logradouro
  if (brData.numero) endereco.numero = brData.numero
  if (brData.complemento) endereco.complemento = brData.complemento
  if (brData.bairro) endereco.bairro = brData.bairro
  if (brData.municipio) endereco.municipio = brData.municipio
  if (brData.estado) endereco.estado = brData.estado
  if (brData.pais) endereco.pais = brData.pais

  if (Object.keys(endereco).length > 0) {
    data.endereco = endereco
  }

  return data
}

/**
 * BR Conselhos Authentication Strategy
 *
 * Esta strategy permite autenticação via:
 * 1. Headers X-BRConselhos-Usuario e X-BRConselhos-Senha (para APIs)
 * 2. Authorization Bearer token (JWT padrão do Payload)
 *
 * Fluxo:
 * - Se receber credenciais BR Conselhos via headers, autentica diretamente
 * - Cria/atualiza o advogado no Payload e retorna o usuário autenticado
 */
export const brConselhosStrategy: AuthStrategy = {
  name: 'br-conselhos',
  authenticate: async ({ payload, headers }) => {
    // Verifica se há credenciais BR Conselhos nos headers
    const usuario = headers.get('X-BRConselhos-Usuario')
    const senha = headers.get('X-BRConselhos-Senha')

    // Se não há credenciais BR Conselhos, retorna null para tentar outras strategies
    if (!usuario || !senha) {
      return { user: null }
    }

    try {
      // Autentica com BR Conselhos
      const authResult = await authenticateBRConselhos(usuario, senha)

      if (!authResult.success || !authResult.data) {
        return { user: null }
      }

      const brData = authResult.data

      // Verifica situação do advogado
      if (brData.situacaoAtual?.toLowerCase().includes('cancelado')) {
        return { user: null }
      }

      // Prepara dados do advogado
      const lawyerData = prepareLawyerData(brData)

      // Busca advogado existente
      let lawyer: any = null

      // Tenta pelo loginUser do BR Conselhos
      if (brData.loginUser) {
        const existingByLogin = await payload.find({
          collection: 'lawyers',
          where: {
            brConselhosLoginUser: { equals: brData.loginUser },
          },
          limit: 1,
        })

        if (existingByLogin.docs.length > 0) {
          lawyer = existingByLogin.docs[0]
        }
      }

      // Tenta pelo número da OAB
      if (!lawyer && brData.registroConselho) {
        const existingByOab = await payload.find({
          collection: 'lawyers',
          where: {
            oabNumber: { equals: brData.registroConselho },
          },
          limit: 1,
        })

        if (existingByOab.docs.length > 0) {
          lawyer = existingByOab.docs[0]
        }
      }

      // Tenta pelo CPF
      if (!lawyer && lawyerData.cpf) {
        const existingByCpf = await payload.find({
          collection: 'lawyers',
          where: {
            cpf: { equals: lawyerData.cpf as string },
          },
          limit: 1,
        })

        if (existingByCpf.docs.length > 0) {
          lawyer = existingByCpf.docs[0]
        }
      }

      // Cria ou atualiza o advogado
      if (lawyer) {
        lawyer = await payload.update({
          collection: 'lawyers',
          id: lawyer.id,
          data: lawyerData as any,
        })
      } else {
        if (!brData.nome) {
          return { user: null }
        }

        lawyer = await payload.create({
          collection: 'lawyers',
          data: {
            ...lawyerData,
            name: brData.nome,
          } as any,
        })
      }

      return {
        user: {
          collection: 'lawyers',
          ...lawyer,
        },
      }
    } catch (error) {
      console.error('Erro na autenticação BR Conselhos:', error)
      return { user: null }
    }
  },
}
