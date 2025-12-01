import axios from 'axios';

const API_KEY = process.env.ANYAPI_CURRENCY_EXCHANGE_API_KEY;
const API_URL = 'https://api.anyapi.io/v1/exchange/convert';

export async function convertCurrency(amount: number, from: string, to: string): Promise<number> {
  try {
    const response = await axios.get(API_URL, {
      params: {
        api_key: API_KEY,
        base_currency: from,
        target_currency: to,
        amount: amount
      }
    });

    return response.data.converted_amount;
  } catch (error) {
    console.error('Error converting currency:', error);
    throw new Error('Failed to convert currency');
  }
}