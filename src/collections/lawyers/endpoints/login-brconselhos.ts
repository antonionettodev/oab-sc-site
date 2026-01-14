import type { Endpoint } from 'payload'
import jwt from 'jsonwebtoken'
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
 * Mapeia inadimplente para boolean
 */
function mapInadimplente(value?: string): boolean {
  if (!value) return false
  return value.toLowerCase() === 'sim'
}

/**
 * Mapeia jovem advogado para boolean
 */
function mapJovemAdvogado(value?: string): boolean {
  if (!value) return false
  return value.toLowerCase() === 'sim'
}

/**
 * Prepara dados do advogado para criar/atualizar no Payload
 */
function prepareLawyerData(brData: BRConselhosLawyerData) {
  // Remove campos undefined para evitar sobrescrever dados existentes
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
  if (brData.inadimplente) data.inadimplente = mapInadimplente(brData.inadimplente)
  if (brData.jovemAdvogado) data.jovemAdvogado = mapJovemAdvogado(brData.jovemAdvogado)
  if (brData.dataAcordao) data.dataAcordao = parseBrazilianDate(brData.dataAcordao)
  if (brData.dataAcordaoEstagiario) data.dataAcordaoEstagiario = parseBrazilianDate(brData.dataAcordaoEstagiario)
  if (brData.loginUser) data.brConselhosLoginUser = brData.loginUser

  // Endereço - só adiciona se tiver pelo menos um campo
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
 * Endpoint de login usando a API do BR Conselhos
 *
 * POST /api/lawyers/login-brconselhos
 *
 * Body:
 * - usuario: Login do usuário no BR Conselhos
 * - senha: Senha do usuário no BR Conselhos
 *
 * Response:
 * - token: JWT token para autenticação
 * - user: Dados do advogado
 * - exp: Timestamp de expiração do token
 */
export const loginBRConselhosEndpoint: Endpoint = {
  path: '/login-brconselhos',
  method: 'post',
  handler: async (req) => {
    const payload = req.payload

    try {
      const body = await req.json?.()

      if (!body) {
        return Response.json(
          { success: false, error: 'Corpo da requisição inválido' },
          { status: 400 },
        )
      }

      const { usuario, senha } = body

      if (!usuario || !senha) {
        return Response.json(
          { success: false, error: 'Usuário e senha são obrigatórios' },
          { status: 400 },
        )
      }

      // Autentica com BR Conselhos
      const authResult = await authenticateBRConselhos(usuario, senha)

      if (!authResult.success || !authResult.data) {
        return Response.json(
          {
            success: false,
            error: authResult.error || 'Usuário e senha inválidos',
          },
          { status: 401 },
        )
      }

      const brData = authResult.data

      // Verifica situação do advogado
      if (brData.situacaoAtual && brData.situacaoAtual.toLowerCase().includes('cancelado')) {
        return Response.json(
          {
            success: false,
            error: 'Registro cancelado na OAB. Login não permitido.',
          },
          { status: 403 },
        )
      }

      // Prepara dados do advogado
      const lawyerData = prepareLawyerData(brData)

      // Busca advogado existente pelo loginUser do BR Conselhos ou CPF
      let lawyer: any = null

      // Primeiro tenta pelo loginUser
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

      // Se não encontrou, tenta pelo número da OAB
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

      // Se não encontrou, tenta pelo CPF
      if (!lawyer && lawyerData.cpf) {
        const existingByCpf = await payload.find({
          collection: 'lawyers',
          where: {
            cpf: { equals: lawyerData.cpf },
          },
          limit: 1,
        })

        if (existingByCpf.docs.length > 0) {
          lawyer = existingByCpf.docs[0]
        }
      }

      // Cria ou atualiza o advogado
      if (lawyer) {
        // Atualiza dados existentes
        lawyer = await payload.update({
          collection: 'lawyers',
          id: lawyer.id,
          data: lawyerData as any,
        })
      } else {
        // Cria novo advogado - nome é obrigatório
        if (!brData.nome) {
          return Response.json(
            {
              success: false,
              error: 'Nome não retornado pelo BR Conselhos. Contate o suporte.',
            },
            { status: 400 },
          )
        }

        lawyer = await payload.create({
          collection: 'lawyers',
          data: {
            ...lawyerData,
            name: brData.nome,
          } as any,
        })
      }

      // Gera JWT token
      const secret = payload.secret
      const tokenExpiration = 60 * 60 * 24 * 7 // 7 dias em segundos

      const tokenData = {
        id: lawyer.id,
        collection: 'lawyers',
        email: lawyer.email,
      }

      const token = jwt.sign(tokenData, secret, {
        expiresIn: tokenExpiration,
      })

      const exp = Math.floor(Date.now() / 1000) + tokenExpiration

      // Retorna resposta similar ao login padrão do Payload
      return Response.json({
        success: true,
        message: 'Login realizado com sucesso',
        token,
        exp,
        user: {
          id: lawyer.id,
          name: lawyer.name,
          email: lawyer.email,
          oabNumber: lawyer.oabNumber,
          situacaoAtual: lawyer.situacaoAtual,
          inadimplente: lawyer.inadimplente,
          subUnidade: lawyer.subUnidade,
          collection: 'lawyers',
        },
      })
    } catch (error: any) {
      console.error('Erro no login BR Conselhos:', error)
      return Response.json(
        {
          success: false,
          error: error.message || 'Erro interno do servidor',
        },
        { status: 500 },
      )
    }
  },
}

/**
 * Endpoint para sincronizar dados do advogado com BR Conselhos
 * Requer autenticação prévia
 *
 * POST /api/lawyers/sync-brconselhos
 *
 * Body:
 * - usuario: Login do usuário no BR Conselhos
 * - senha: Senha do usuário no BR Conselhos
 */
export const syncBRConselhosEndpoint: Endpoint = {
  path: '/sync-brconselhos',
  method: 'post',
  handler: async (req) => {
    const payload = req.payload

    try {
      // Verifica se há um advogado autenticado
      const user = req.user

      if (!user || !('collection' in req) || (req as any).collection !== 'lawyers') {
        // Tenta autenticação pelo body
        const body = await req.json?.()

        if (!body?.usuario || !body?.senha) {
          return Response.json(
            { success: false, error: 'Autenticação necessária' },
            { status: 401 },
          )
        }

        // Autentica com BR Conselhos
        const authResult = await authenticateBRConselhos(body.usuario, body.senha)

        if (!authResult.success || !authResult.data) {
          return Response.json(
            { success: false, error: authResult.error || 'Credenciais inválidas' },
            { status: 401 },
          )
        }

        const brData = authResult.data
        const lawyerData = prepareLawyerData(brData)

        // Busca e atualiza advogado
        let lawyer: any = null

        if (brData.loginUser) {
          const existing = await payload.find({
            collection: 'lawyers',
            where: {
              brConselhosLoginUser: { equals: brData.loginUser },
            },
            limit: 1,
          })

          if (existing.docs.length > 0) {
            lawyer = existing.docs[0]
          }
        }

        if (!lawyer && lawyerData.cpf) {
          const existingByCpf = await payload.find({
            collection: 'lawyers',
            where: {
              cpf: { equals: lawyerData.cpf },
            },
            limit: 1,
          })

          if (existingByCpf.docs.length > 0) {
            lawyer = existingByCpf.docs[0]
          }
        }

        if (!lawyer) {
          return Response.json(
            { success: false, error: 'Advogado não encontrado no sistema' },
            { status: 404 },
          )
        }

        lawyer = await payload.update({
          collection: 'lawyers',
          id: lawyer.id,
          data: lawyerData as any,
        })

        return Response.json({
          success: true,
          message: 'Dados sincronizados com sucesso',
          user: {
            id: lawyer.id,
            name: lawyer.name,
            email: lawyer.email,
            oabNumber: lawyer.oabNumber,
            situacaoAtual: lawyer.situacaoAtual,
            lastSync: lawyer.brConselhosLastSync,
          },
        })
      }

      return Response.json(
        { success: false, error: 'Forneça as credenciais do BR Conselhos' },
        { status: 400 },
      )
    } catch (error: any) {
      console.error('Erro na sincronização BR Conselhos:', error)
      return Response.json(
        { success: false, error: error.message || 'Erro interno do servidor' },
        { status: 500 },
      )
    }
  },
}
