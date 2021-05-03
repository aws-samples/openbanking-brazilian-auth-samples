exports.handler = async function (event, context) {
  let response
  try {
    if (event.httpMethod !== 'GET') {
      throw new Error(`Only accept GET method, you tried: ${event.httpMethod}`)
    }

    response = {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify("Hello From Authorized API")
    }
  } catch (err) {
    response = {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(err)
    }
  }
  return response
}