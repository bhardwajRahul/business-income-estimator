import axios from 'axios';

interface WiseBalance {
  currency: string;
  amount: number;
}

export async function getWiseAccountBalance(): Promise<WiseBalance> {
  try {
    // Note: In a real-world scenario, this should be a server-side API call
    // to protect your API keys and comply with CORS policies
    const response = await axios.get('https://api.transferwise.com/v1/borderless-accounts', {
      headers: {
        Authorization: `Bearer ${process.env.WISE_API_TOKEN}`
      }
    });
    
    const account = response.data[0]; // Assuming you're interested in the first account
    const balance = account.balances[0]; // Assuming you're interested in the first balance

    return {
      currency: balance.currency,
      amount: balance.amount
    };
  } catch (error) {
    console.error('Error fetching Wise account balance:', error);
    throw error;
  }
}