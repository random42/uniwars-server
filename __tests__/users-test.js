const axios = require('axios');
axios.defaults.baseURL = 'http://localhost:3000/';

test('search', async () => {
  try {
    let res = await axios({
      url: '/users/search',
      params: {
        page: 0,
        text: "dom"
      }
    });
    console.log(res.data);
    //expect(res.data[0].username).toBe("random");
  }
  catch(err) {
    console.log(err);
  }
});
