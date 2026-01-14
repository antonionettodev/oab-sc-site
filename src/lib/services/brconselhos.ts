/**
 * BR Conselhos Authentication Service
 *
 * This service integrates with the BR Conselhos SOAP Web Service for lawyer authentication.
 * The service validates credentials and returns cadastral information for the lawyer.
 */

export interface BRConselhosLawyerData {
  status: string
  registroConselho?: string
  registroConselhoTemporario?: string
  nome?: string
  dataNascimentoFundacao?: string
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  municipio?: string
  estado?: string
  pais?: string
  estadoCivil?: string
  nomeMae?: string
  nomePai?: string
  emailComercial?: string
  telefoneComercial?: string
  telefone2Comercial?: string
  subUnidade?: string
  dataAcordao?: string
  dataAcordaoEstagiario?: string
  inadimplente?: string
  situacaoAtual?: string
  jovemAdvogado?: string
  cpfCnpj?: string
  rg?: string
  orgaoEmissorRG?: string
  dataEmissaoRG?: string
  loginUser?: string
}

export interface BRConselhosAuthResult {
  success: boolean
  data?: BRConselhosLawyerData
  error?: string
}

/**
 * Parse the XML response from BR Conselhos Web Service
 */
function parseXMLResponse(xmlString: string): BRConselhosLawyerData {
  const getTagValue = (xml: string, tag: string): string | undefined => {
    const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i')
    const match = xml.match(regex)
    return match ? match[1].trim() : undefined
  }

  const status = getTagValue(xmlString, 'Status') || 'Erro desconhecido'

  if (status !== 'OK') {
    return { status }
  }

  return {
    status,
    registroConselho: getTagValue(xmlString, 'RegistroConselho'),
    registroConselhoTemporario: getTagValue(xmlString, 'RegistroConselhoTemporario'),
    nome: getTagValue(xmlString, 'Nome'),
    dataNascimentoFundacao: getTagValue(xmlString, 'DataNascimentoFundacao'),
    cep: getTagValue(xmlString, 'CEPCorreio.CEP'),
    logradouro: getTagValue(xmlString, 'LogradouroCorreio'),
    numero: getTagValue(xmlString, 'NumeroCorreio'),
    complemento: getTagValue(xmlString, 'ComplementoCorreio'),
    bairro: getTagValue(xmlString, 'BairroCorreio'),
    municipio: getTagValue(xmlString, 'MunicipioCorreio.Descricao'),
    estado: getTagValue(xmlString, 'MunicipioCorreio.Estado.Sigla') || getTagValue(xmlString, 'MunicipioCorreio.EstadoSigla'),
    pais: getTagValue(xmlString, 'MunicipioCorreio.Pais.Descricao'),
    estadoCivil: getTagValue(xmlString, 'EstadoCivil'),
    nomeMae: getTagValue(xmlString, 'NomeMae'),
    nomePai: getTagValue(xmlString, 'NomePai'),
    emailComercial: getTagValue(xmlString, 'EMailComercial') || getTagValue(xmlString, 'EmailComercial'),
    telefoneComercial: getTagValue(xmlString, 'TelefoneComercial'),
    telefone2Comercial: getTagValue(xmlString, 'Telefone2Comercial'),
    subUnidade: getTagValue(xmlString, 'SubUnidadeAtual.NomeSubUnidade') || getTagValue(xmlString, 'SubUnidadeAtal.NomeSubUnidade'),
    dataAcordao: getTagValue(xmlString, 'DataAcordao'),
    dataAcordaoEstagiario: getTagValue(xmlString, 'DataAcordaoEstagiario'),
    inadimplente: getTagValue(xmlString, 'Inadimplente'),
    situacaoAtual: getTagValue(xmlString, 'SituacaoAtual'),
    jovemAdvogado: getTagValue(xmlString, 'JovemAdvogado'),
    cpfCnpj: getTagValue(xmlString, 'CPFCNPJ'),
    rg: getTagValue(xmlString, 'RG'),
    orgaoEmissorRG: getTagValue(xmlString, 'OrgaoEmissorRG') || getTagValue(xmlString, 'ÓrgãoEmissorRG'),
    dataEmissaoRG: getTagValue(xmlString, 'DataEmissaoRG'),
    loginUser: getTagValue(xmlString, 'LoginUser'),
  }
}

/**
 * Build SOAP envelope for authentication request
 */
function buildSoapEnvelope(usuario: string, senha: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    <Autenticar xmlns="http://tempuri.org/">
      <Usuario>${escapeXml(usuario)}</Usuario>
      <Senha>${escapeXml(senha)}</Senha>
    </Autenticar>
  </soap:Body>
</soap:Envelope>`
}

/**
 * Escape special XML characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Authenticate a lawyer using the BR Conselhos Web Service
 *
 * @param usuario - The UserID in BR Conselhos system
 * @param senha - The user's password
 * @returns Authentication result with lawyer data if successful
 */
export async function authenticateBRConselhos(
  usuario: string,
  senha: string,
): Promise<BRConselhosAuthResult> {
  const baseUrl = process.env.BRCONSELHOS_BASE_URL

  if (!baseUrl) {
    return {
      success: false,
      error: 'BR Conselhos service URL not configured',
    }
  }

  const endpoint = `${baseUrl}/WSAutenticar.asmx`
  const soapEnvelope = buildSoapEnvelope(usuario, senha)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: 'http://tempuri.org/Autenticar',
      },
      body: soapEnvelope,
    })

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error: ${response.status} ${response.statusText}`,
      }
    }

    const xmlResponse = await response.text()

    // Extract the result from SOAP response
    const resultMatch = xmlResponse.match(/<AutenticarResult>([\s\S]*?)<\/AutenticarResult>/i)
    const resultXml = resultMatch ? resultMatch[1] : xmlResponse

    // Decode HTML entities if present
    const decodedXml = resultXml
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")

    const parsedData = parseXMLResponse(decodedXml)

    if (parsedData.status === 'OK') {
      return {
        success: true,
        data: parsedData,
      }
    }

    return {
      success: false,
      error: parsedData.status,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Parse Brazilian date format (DD/MM/YYYY) to ISO date string
 */
export function parseBrazilianDate(dateStr?: string): string | undefined {
  if (!dateStr) return undefined

  const parts = dateStr.split('/')
  if (parts.length !== 3) return undefined

  const [day, month, year] = parts
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

/**
 * Clean CPF/CNPJ string (remove formatting)
 */
export function cleanCpfCnpj(value?: string): string | undefined {
  if (!value) return undefined
  return value.replace(/[^\d]/g, '')
}

/**
 * Clean phone number (remove formatting)
 */
export function cleanPhone(value?: string): string | undefined {
  if (!value) return undefined
  return value.replace(/[^\d]/g, '')
}
