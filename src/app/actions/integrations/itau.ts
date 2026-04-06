import axios from 'axios';

const ITAU_BASE_URL = 'https://api-sp.dev.aws.cloud.ihf/boletoscash/v2';
const ITAU_SANDBOX_URL = 'https://sandbox.devportal.itau.com.br/itau-ep9-gtw-boletoscash-boletoscash-v2-ext-aws/v1';

export async function getItauToken(clientId: string, clientSecret: string, isSandbox = true) {
  // Lógica de autenticação OAuth2 do Itaú
  // De acordo com a documentação do Itaú para gerar o token
  const tokenUrl = isSandbox 
    ? 'https://sandbox.devportal.itau.com.br/api/oauth/token' 
    : 'https://sts.itau.com.br/api/oauth/token'; // Exemplo de URL de prod

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    const response = await axios.post(tokenUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Erro ao obter token do Itaú:', error);
    throw new Error('Falha na autenticação com a API do Itaú');
  }
}

export async function getBoletos(params: {
  id_beneficiario: string;
  codigo_carteira: string;
  nosso_numero?: string;
  view?: string;
  clientId: string;
  clientSecret: string;
  isSandbox?: boolean;
}) {
  const { id_beneficiario, codigo_carteira, nosso_numero, view, clientId, clientSecret, isSandbox = true } = params;
  
  const token = await getItauToken(clientId, clientSecret, isSandbox);
  const baseUrl = isSandbox ? ITAU_SANDBOX_URL : ITAU_BASE_URL;

  try {
    const response = await axios.get(`${baseUrl}/boletos`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-itau-correlationid': crypto.randomUUID(),
        'x-itau-apikey': clientId,
        'x-itau-flowid': 'vision-consult',
      },
      params: {
        id_beneficiario,
        codigo_carteira,
        nosso_numero,
        view
      }
    });

    return response.data;
  } catch (error) {
    console.error('Erro ao buscar boletos no Itaú:', error);
    throw new Error('Falha ao consultar boletos');
  }
}
