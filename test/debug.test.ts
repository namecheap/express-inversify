import {Container} from 'inversify';
import {cleanUpMetadata} from '../src/utils';
import {
    InversifyExpressServer,
    controller,
    httpGet,
    requestParam,
    httpPost,
    httpDelete,
    getRouteInfo,
    BaseHttpController,
} from '../src/index';

describe('Debug utils', () => {
    beforeEach(done => {
        cleanUpMetadata();
        done();
    });

    it('should be able to get router info', () => {
        const container = new Container();

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

        const TYPES = {
            OrderController: OrderController.name,
            UserController: UserController.name,
        };

        const server = new InversifyExpressServer(container);
        server.build();

        const routeInfo = getRouteInfo(container);

        expect(routeInfo[0]?.controller).toBe(TYPES.OrderController);
        expect(routeInfo[0]?.endpoints[0]?.route).toBe('GET /api/order/');
        expect(routeInfo[0]?.endpoints[0]?.args).toBeUndefined();
        expect(routeInfo[0]?.endpoints[1]?.route).toBe('POST /api/order/');
        expect(routeInfo[0]?.endpoints[1]?.args).toBeUndefined();
        expect(routeInfo[0]?.endpoints[2]?.route).toBe('DELETE /api/order/:id');

        const arg1 = routeInfo[0]?.endpoints[2]?.args;
        if (arg1 !== undefined) {
            expect(arg1[0]).toBe('@requestParam id');
        } else {
            expect(true).toBe(false);
        }

        expect(routeInfo[1]?.controller).toBe(TYPES.UserController);
        expect(routeInfo[1]?.endpoints[0]?.route).toBe('GET /api/user/');
        expect(routeInfo[1]?.endpoints[1]?.args).toBeUndefined();
        expect(routeInfo[1]?.endpoints[1]?.route).toBe('POST /api/user/');
        expect(routeInfo[1]?.endpoints[1]?.args).toBeUndefined();
        expect(routeInfo[1]?.endpoints[2]?.route).toBe('DELETE /api/user/:id');

        const arg2 = routeInfo[1]?.endpoints[2]?.args;
        if (arg2 !== undefined) {
            expect(arg2[0]).toBe('@requestParam id');
        } else {
            expect(true).toBe(false);
        }
    });

    it('should be able to handle missig parameter metadata', () => {
        const container = new Container();

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
        }

        const TYPES = {
            OrderController: OrderController.name,
        };

        const server = new InversifyExpressServer(container);
        server.build();

        const routeInfo = getRouteInfo(container);

        expect(routeInfo[0]?.controller).toBe(TYPES.OrderController);
        expect(routeInfo[0]?.endpoints[0]?.route).toBe('GET /api/order/');
        expect(routeInfo[0]?.endpoints[0]?.args).toBeUndefined();
        expect(routeInfo[0]?.endpoints[1]?.route).toBe('POST /api/order/');
        expect(routeInfo[0]?.endpoints[1]?.args).toBeUndefined();
    });
});
