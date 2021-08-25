# sharklet-cli

The nodejs CLI tool of sharklet API.


## Installation

Install it and run your CLI commands.

```sh
$ npm install sharklet-cli -g
```

## Prerequisite

Node.js >= 10.x

### Notes

You must know your `AK`(`accessKeyId/accessKeySecret`), and the cloud product's `endpoint` and `apiVersion`.

## Usage

The CLI style tools:

### 1. Prepare an empty directory.
```sh
$ mkdir yourProject & cd yourProject
```

### 2. Initialize and coding with edge.js as example codes.
```sh
$ sharklet-cli init
```

```js
/**
 * Add the necessary event listener
 * @param {Event} fetch event, {Function} async function
 */
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
})

/**
 * Make a response to client
 * @param {Request} request
 */
async function handleRequest(request) {
  return new Response('Hello World!', { status: 200 });
}
```

### 3. Config with your wangsu access, fill in the prompts here.
```sh
$ sharklet-cli config
```

### 4. Build code and you can test with gray env .
```sh
$ sharklet-cli build
```

### 5. Test your code now, you can also show your codes and related config.
```sh
$ curl -v 'http://yourdomain.com/yourpath/' -x 42.123.119.50:80
```

```sh
$ curl --resolve yourdomain.com:443:42.123.119.50 'https://yourdomain.com/yourpath/' -v
```

```sh
$ sharklet-cli build -s
```

### 6. Publish code only when you are ready online after detailed tests.
```sh
$ sharklet-cli publish
```

### 7. Test your code online and check your service ok.
```sh
$ curl -v 'https://yourdomain.com/yourpath/'
```

```sh
$ sharklet-cli publish -s
```


## License
The MIT License
