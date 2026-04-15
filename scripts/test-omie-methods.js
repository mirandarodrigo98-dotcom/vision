const axios = require('axios');

async function main() {
    // We don't have a direct "list methods" endpoint usually, but we can try an invalid method to see if it lists them.
    try {
      const res = await axios.post('https://app.omie.com.br/api/v1/geral/contacorrente/', {
        call: "InvalidMethod",
        app_key: "test",
        app_secret: "test",
        param: [{ }]
      });
      console.log(res.data);
    } catch (e) {
      console.log(e.response?.data || e.message);
    }
}
main();