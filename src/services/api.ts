import axios from 'axios';


export const searchQuery = async (q: string, limit: number, from: number) => {

    const token = 'Jy8RZCXvvc6pZQUu2QZ2';

    try {
        const response = await axios.get('https://be-v2.convose.com/autocomplete/interests', {
            headers: {
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Accept-Language': 'en-GB,en;q=0.9,en-US;q=0.8,de-DE;q=0.7,de;q=0.6',
                'Authorization': `${token}`,
                'Connection': 'Keep-alive',
                'Host': 'be-v2.convose.com',
            },
            params: {
                q: q,
                limit: limit,
                from: from,
            },
        });
        console.log('response: ', response.data);
        return response.data;
    } catch (error) {
        console.error('Error fetching data:', error);
    }

};


