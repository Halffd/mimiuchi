const webhook = {
    post : async function(url: string, body: any) {
        console.log(body)
        return new Promise((resolve, reject) => {
            fetch(url, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    "Access-Control-Allow-Origin": '*',
                },
                body: JSON.stringify(body)
            }).then(response => {
                return resolve(response)
            }).catch(error => {
                reject(error)
            })
        })
    }
}

export default webhook