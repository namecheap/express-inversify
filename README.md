# @namecheap/express-inversify



Some utilities for the development of express applications with Inversify.

## Installation

You can install `express-inversify` using npm:

```sh
npm install inversify @namecheap/express-inversify reflect-metadata --save
```

The `express-inversify` type definitions are included in the npm module and require TypeScript 2.0.
Please refer to the [InversifyJS documentation](https://github.com/inversify/InversifyJS#installation) to learn more about the installation process.

## The Basics

### Step 1: Decorate your controllers

To use a class as a 'controller' for your express app, simply add the `@controller` decorator to the class. Similarly, decorate methods of the class to serve as request handlers.

The following example will declare a controller that responds to `GET /foo'.

```ts
import * as express from 'express';
import { interfaces, controller, httpGet, httpPost, httpDelete, request, queryParam, response, requestParam } from '@namecheap/express-inversify';
import { injectable, inject } from 'inversify';

@controller('/foo')
export class FooController implements interfaces.Controller {

    constructor( @inject('FooService') private fooService: FooService ) {}

    @httpGet('/')
    private index(@request() req: express.Request, @response() res: express.Response, @next() next: express.NextFunction): string {
        return this.fooService.get(req.query.id);
    }

    @httpGet('/')
    private list(@queryParam('start') start: number, @queryParam('count') count: number): string {
        return this.fooService.get(start, count);
    }

    @httpPost('/')
    private async create(@request() req: express.Request, @response() res: express.Response) {
        try {
            await this.fooService.create(req.body);
            res.sendStatus(201);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    @httpDelete('/:id')
    private delete(@requestParam('id') id: string, @response() res: express.Response): Promise<void> {
        return this.fooService.delete(id)
            .then(() => res.sendStatus(200))
            .catch((err: Error) => {
                res.status(400).json({ error: err.message });
            });
    }
}
```

### Step 2: Configure container and server

Configure the inversify container in your composition root as usual.

Then, pass the container to the InversifyExpressServer constructor. This will allow it to register all controllers and their dependencies from your container and attach them to the express app.
Then just call server.build() to prepare your app.

In order for the InversifyExpressServer to find your controllers, you must bind them to the `TYPE.Controller` service identifier and tag the binding with the controller's name.
The `Controller` interface exported by express-inversify is empty and solely for convenience, so feel free to implement your own if you want.

```ts
import * as bodyParser from 'body-parser';

import { Container } from 'inversify';
import { interfaces, InversifyExpressServer, TYPE } from '@namecheap/express-inversify';

// declare metadata by @controller annotation
import './controllers/foo_controller';

// set up container
let container = new Container();

// set up bindings
container.bind<FooService>('FooService').to(FooService);

// create server
let server = new InversifyExpressServer(container);
server.setConfig((app) => {
  // add body parser
  app.use(bodyParser.urlencoded({
    extended: true
  }));
  app.use(bodyParser.json());
});

let app = server.build();
app.listen(3000);
```

## Important information about the @controller decorator

Since the `inversify-express-util@5.0.0` release. The `@injectable` annotation is no longer required in classes annotated with `@controller`. Declaring a type binding for controllers is also no longer required in classes annotated with `@controller`.

:warning: Declaring a binding is not required for Controllers but **it is required to import the controller one unique time**. When the controller file is imported (e.g. `import './controllers/some_controller'`) the class is declared and the metadata is generated. If you don't import it the metadata is never generated and therefore the controller is not found. An example of this can be found [here](https://github.com/inversify/inversify-express-example/blob/master/MongoDB/bootstrap.ts#L10-L11).

If you run the application multiple times within a shared runtime process (e.g. unit testing) you might need to clean up the existing metadata before each test.

```ts
import { cleanUpMetadata } from '@namecheap/express-inversify';

describe('Some Component', () => {

    beforeEach(() => {
        cleanUpMetadata();
    });

    it('Some test case', () => {
        // ...
    });

});
```


## InversifyExpressServer

A wrapper for an express Application.

### `.setConfig(configFn)`

Optional - exposes the express application object for convenient loading of server-level middleware.

```ts
import * as morgan from 'morgan';
// ...
let server = new InversifyExpressServer(container);

server.setConfig((app) => {
    var logger = morgan('combined')
    app.use(logger);
});
```

### `.setErrorConfig(errorConfigFn)`

Optional - like `.setConfig()`, except this function is applied after registering all app middleware and controller routes.

```ts
let server = new InversifyExpressServer(container);
server.setErrorConfig((app) => {
    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).send('Something broke!');
    });
});
```

### `.build()`

Attaches all registered controllers and middleware to the express application. Returns the application instance.

```ts
// ...
let server = new InversifyExpressServer(container);
server
    .setConfig(configFn)
    .setErrorConfig(errorConfigFn)
    .build()
    .listen(3000, 'localhost', callback);
```

## Using a custom Router

It is possible to pass a custom `Router` instance to `InversifyExpressServer`:

```ts
let container = new Container();

let router = express.Router({
    caseSensitive: false,
    mergeParams: false,
    strict: false
});

let server = new InversifyExpressServer(container, router);
```

By default server will serve the API at `/` path, but sometimes you might need to use different root namespace, for
example all routes should start with `/api/v1`. It is possible to pass this setting via routing configuration to
`InversifyExpressServer`

```ts
let container = new Container();

let server = new InversifyExpressServer(container, null, { rootPath: '/api/v1' });
```

## Using a custom express application

It is possible to pass a custom `express.Application` instance to `InversifyExpressServer`:

```ts
let container = new Container();

let app = express();
//Do stuff with app

let server = new InversifyExpressServer(container, null, null, app);
```

## Decorators

### `@controller(path, [middleware, ...])`

Registers the decorated class as a controller with a root path, and optionally registers any global middleware for this controller.

### `@httpMethod(method, path, [middleware, ...])`

Registers the decorated controller method as a request handler for a particular path and method, where the method name is a valid express routing method.

### `@SHORTCUT(path, [middleware, ...])`

Shortcut decorators which are simply wrappers for `@httpMethod`. Right now these include `@httpGet`, `@httpPost`, `@httpPut`, `@httpPatch`, `@httpHead`, `@httpDelete`, and `@All`. For anything more obscure, use `@httpMethod` (Or make a PR :smile:).

### `@request()`

Binds a method parameter to the request object.

### `@response()`

Binds a method parameter to the response object.

### `@requestParam(name: string)`

Binds a method parameter to request.params object or to a specific parameter if a name is passed.

### `@queryParam(name: string)`

Binds a method parameter to request.query or to a specific query parameter if a name is passed.

### `@requestBody()`

Binds a method parameter to the request.body. If the bodyParser middleware is not used on the express app, this will bind the method parameter to the express request object.

### `@requestHeaders(name: string)`

Binds a method parameter to the request headers.

### `@cookies(name: string)`

Binds a method parameter to the request cookies.

### `@next()`

Binds a method parameter to the next() function.

### `@principal()`

Binds a method parameter to the user principal obtained from the AuthProvider.

## BaseHttpController

The `BaseHttpController` is a base class that provides a significant amount of helper functions in order to aid writing testable controllers.  When returning a response from a method defined on one of these controllers, you may use the `response` object available on the `httpContext` property described in the next section, or you may return an `HttpResponseMessage`, or you may return an object that implements the IHttpActionResult interface.

The benefit of the latter two methods is that since your controller is no longer directly coupled to requiring an httpContext to send a response, unit testing controllers becomes extraordinarily simple as you no longer need to mock the entire response object, you can simply run assertions on the returned value.  This API also allows us to make future improvements in this area and add in functionality that exists in similar frameworks (.NET WebAPI) such as media formatters, content negotation, etc.

```ts
import { injectable, inject } from 'inversify';
import {
    controller, httpGet, BaseHttpController, HttpResponseMessage, StringContent
} from '@namecheap/express-inversify';

@controller('/')
class ExampleController extends BaseHttpController {
    @httpGet('/')
    public async get() {
        const response = new HttpResponseMessage(200);
        response.content = new StringContent('foo');
        return response;
    }
```

On the BaseHttpController, we provide a litany of helper methods to ease returning common IHttpActionResults including

* OkResult
* OkNegotiatedContentResult
* RedirectResult
* ResponseMessageResult
* StatusCodeResult
* BadRequestErrorMessageResult
* BadRequestResult
* ConflictResult
* CreatedNegotiatedContentResult
* ExceptionResult
* InternalServerError
* NotFoundResult
* JsonResult

```ts
import { injectable, inject } from 'inversify';
import {
    controller, httpGet, BaseHttpController
} from '@namecheap/express-inversify';

@controller('/')
class ExampleController extends BaseHttpController {
    @httpGet('/')
    public async get() {
        return this.ok('foo');
    }
```

### JsonResult

In some scenarios, you'll want to set the status code of the response.
This can be done by using the `json` helper method provided by `BaseHttpController`.

```ts
import {
    controller, httpGet, BaseHttpController
} from '@namecheap/express-inversify';

@controller('/')
export class ExampleController extends BaseHttpController {
    @httpGet('/')
    public async get() {
        const content = { foo: 'bar' };
        const statusCode = 403;

        return this.json(content, statusCode);
    }
}
```

This gives you the flexability to create your own responses while keeping unit testing simple.

```ts
import { expect } from 'chai';

import { ExampleController } from './example-controller';
import { results } from '@namecheap/express-inversify';

describe('ExampleController', () => {
    let controller: ExampleController;

    beforeEach(() => {
        controller = new ExampleController();
    });

    describe('#get', () => {
        it('should have a status code of 403', async () => {
            const response = await controller.get();

            expect(response).to.be.an.instanceof(results.JsonResult);
            expect(response.statusCode).to.equal(403);
        });
    });
});
```
*This example uses [Mocha](https://mochajs.org) and [Chai](http://www.chaijs.com) as a unit testing framework*

## HttpContext

The `HttpContext` property allow us to access the current request,
response and user with ease. `HttpContext` is available as a property
in controllers derived from `BaseHttpController`.

```ts
import { injectable, inject } from 'inversify';
import {
    controller, httpGet, BaseHttpController
} from '@namecheap/express-inversify';

@controller('/')
class UserPreferencesController extends BaseHttpController {

    @inject('AuthService') private readonly _authService: AuthService;

    @httpGet('/')
    public async get() {
        const token = this.httpContext.request.headers['x-auth-token'];
        return await this._authService.getUserPreferences(token);
    }
}
```

If you are creating a custom controller you will need to inject `HttpContext` manually
using the `@injectHttpContext` decorator:

```ts
import { injectable, inject } from 'inversify';
import {
    controller, httpGet, BaseHttpController, httpContext, interfaces
} from '@namecheap/express-inversify';

const authService = inject('AuthService')

@controller('/')
class UserPreferencesController {

    @injectHttpContext private readonly _httpContext: interfaces.HttpContext;
    @authService private readonly _authService: AuthService;

    @httpGet('/')
    public async get() {
        const token = this.httpContext.request.headers['x-auth-token'];
        return await this._authService.getUserPreferences(token);
    }
}
```

## AuthProvider

The `HttpContext` will not have access to the current user if you don't
create a custom `AuthProvider` implementation:

```ts
const server = new InversifyExpressServer(
    container, null, null, null, CustomAuthProvider
);
```

We need to implement the `AuthProvider` interface.

The `AuthProvider` allow us to get a user (`Principal`):

```ts
import { injectable, inject } from 'inversify';
import { interfaces } from '@namecheap/express-inversify';

const authService = inject('AuthService');

@injectable()
class CustomAuthProvider implements interfaces.AuthProvider {

    @authService private readonly _authService: AuthService;

    public async getUser(
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ): Promise<interfaces.Principal> {
        const token = req.headers['x-auth-token']
        const user = await this._authService.getUser(token);
        const principal = new Principal(user);
        return principal;
    }

}
```

We also need to implement the Principal interface.
The `Principal` interface allow us to:

- Access the details of a user
- Check if it has access to certain resource
- Check if it is authenticated
- Check if it is in a user role

```ts
class Principal implements interfaces.Principal {
    public details: any;
    public constructor(details: any) {
        this.details = details;
    }
    public isAuthenticated(): Promise<boolean> {
        return Promise.resolve(true);
    }
    public isResourceOwner(resourceId: any): Promise<boolean> {
        return Promise.resolve(resourceId === 1111);
    }
    public isInRole(role: string): Promise<boolean> {
        return Promise.resolve(role === 'admin');
    }
}
```

We can then access the current user (Principal) via the `HttpContext`:

```ts
@controller('/')
class UserDetailsController extends BaseHttpController {

    @inject('AuthService') private readonly _authService: AuthService;

    @httpGet('/')
    public async getUserDetails() {
        if (this.httpContext.user.isAuthenticated()) {
            return this._authService.getUserDetails(this.httpContext.user.details.id);
        } else {
            throw new Error();
        }
    }
}
```

## BaseMiddleware

Extending `BaseMiddleware` allow us to inject dependencies
and to access the current `HttpContext` in Express middleware function.

```ts
import { BaseMiddleware } from '@namecheap/express-inversify';

@injectable()
class LoggerMiddleware extends BaseMiddleware {
    @inject(TYPES.Logger) private readonly _logger: Logger;
    public handler(
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) {
        if (this.httpContext.user.isAuthenticated()) {
            this._logger.info(`${this.httpContext.user.details.email} => ${req.url}`);
        } else {
            this._logger.info(`Anonymous => ${req.url}`);
        }
        next();
    }
}
```

We also need to declare some type bindings:

```ts
const container = new Container();

container.bind<Logger>(TYPES.Logger)
        .to(Logger);

container.bind<LoggerMiddleware>(TYPES.LoggerMiddleware)
         .to(LoggerMiddleware);

```

We can then inject `TYPES.LoggerMiddleware` into one of our controllers.

```ts
@controller('/')
class UserDetailsController extends BaseHttpController {

    @inject('AuthService') private readonly _authService: AuthService;

    @httpGet('/', TYPES.LoggerMiddleware)
    public async getUserDetails() {
        if (this.httpContext.user.isAuthenticated()) {
            return this._authService.getUserDetails(this.httpContext.user.details.id);
        } else {
            throw new Error();
        }
    }
}
```

### Request-scope services

Middleware extending `BaseMiddleware` is capable of re-binding services in the scope of a HTTP request.
This is useful if you need access to a HTTP request or context-specific property in a service that doesn't have
the direct access to them otherwise.

Consider the below `TracingMiddleware`. In this example we want to capture the `X-Trace-Id` header from the incoming request
and make it available to our IoC services as `TYPES.TraceIdValue`:

```typescript
import { inject, injectable } from 'inversify';
import { BaseHttpController, BaseMiddleware, controller, httpGet } from '@namecheap/express-inversify';
import * as express from 'express';

const TYPES = {
    TraceId: Symbol.for('TraceIdValue'),
    TracingMiddleware: Symbol.for('TracingMiddleware'),
    Service: Symbol.for('Service'),
};

@injectable()
class TracingMiddleware extends BaseMiddleware {

    public handler(
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) {
        this.bind<string>(TYPES.TraceIdValue)
            .toConstantValue(`${ req.header('X-Trace-Id') }`);

        next();
    }
}

@controller('/')
class TracingTestController extends BaseHttpController {

    constructor(@inject(TYPES.Service) private readonly service: Service) {
        super();
    }

    @httpGet(
        '/',
        TYPES.TracingMiddleware
    )
    public getTest() {
        return this.service.doSomethingThatRequiresTheTraceID();
    }
}

@injectable()
class Service {
    constructor(@inject(TYPES.TraceIdValue) private readonly traceID: string) {
    }

    public doSomethingThatRequiresTheTraceID() {
        // ...
    }
}
```

The `BaseMiddleware.bind()` method will bind the `TYPES.TraceIdValue` if it hasn't been bound yet or re-bind if it has
already been bound.

## Route Map

If we have some controllers like for example:

```ts
@controller('/api/user')
class UserController extends BaseHttpController {
    @httpGet('/')
    public get() {
        return {};
    }
    @httpPost('/')
    public post() {
        return {};
    }
    @httpDelete('/:id')
    public delete(@requestParam('id') id: string) {
        return {};
    }
}

@controller('/api/order')
class OrderController extends BaseHttpController {
    @httpGet('/')
    public get() {
        return {};
    }
    @httpPost('/')
    public post() {
        return {};
    }
    @httpDelete('/:id')
    public delete(@requestParam('id') id: string) {
        return {};
    }
}
```

We can use the `prettyjson` function to see all the available enpoints:

```ts
import { getRouteInfo } from '@namecheap/express-inversify';
import * as prettyjson from 'prettyjson';

// ...

let server = new InversifyExpressServer(container);
let app = server.build();
const routeInfo = getRouteInfo(container);

console.log(prettyjson.render({ routes: routeInfo }));

// ...
```

> :warning: Please ensure that you invoke `getRouteInfo` after invoking `server.build()`!

The output formatter by `prettyjson` looks as follows:

```txt
routes:
  -
    controller: OrderController
    endpoints:
      -
        route: GET /api/order/
      -
        route: POST /api/order/
      -
        path: DELETE /api/order/:id
        route:
          - @requestParam id
  -
    controller: UserController
    endpoints:
      -
        route: GET /api/user/
      -
        route: POST /api/user/
      -
        route: DELETE /api/user/:id
        args:
          - @requestParam id
```

## Examples

Some examples can be found at the [inversify-express-example](https://github.com/inversify/inversify-express-example) repository.

## License

License under the MIT License (MIT)

Copyright © 2016-2017 [Cody Simms](https://github.com/codyjs)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.

IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
