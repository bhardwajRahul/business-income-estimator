import axios from 'axios';

export async function verifyVAT(vatNumber: string): Promise<boolean> {
  try {
    // Note: In a real-world scenario, this should be a server-side API call
    // to protect your API keys and comply with CORS policies
    const response = await axios.get(`https://api.vatsystem.eu/numbers/${vatNumber}`);
    return response.data.valid;
  } catch (error) {
    console.error('Error verifying VAT number:', error);
    return false;
  }
}