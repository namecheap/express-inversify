import {Container, injectable, inject} from 'inversify';
import * as supertest from 'supertest';
import {
    InversifyExpressServer,
    controller,
    httpGet,
    BaseHttpController,
} from '../src/index';
import * as interfaces from '../src/interfaces';
import {cleanUpMetadata} from '../src/utils';

describe('AuthProvider', () => {
    beforeEach(done => {
        cleanUpMetadata();
        done();
    });

    it('Should be able to access current user via HttpContext', done => {
        interface SomeDependency {
            name: string;
        }

        class Principal implements interfaces.Principal {
            public details: any;
            constructor(details: any) {
                this.details = details;
            }

            public isAuthenticated() {
                return Promise.resolve<boolean>(true);
            }

            public isResourceOwner(resourceId: any) {
                return Promise.resolve<boolean>(resourceId === 1111);
            }

            public isInRole(role: string) {
                return Promise.resolve<boolean>(role === 'admin');
            }
        }

        @injectable()
        class CustomAuthProvider implements interfaces.AuthProvider {
            @inject('SomeDependency') private readonly _someDependency!: SomeDependency;
            public getUser() {
                const principal = new Principal({
                    email: `${ this._someDependency.name }@test.com`,
                });
                return Promise.resolve(principal);
            }
        }

        interface SomeDependency {
            name: string;
        }

        @controller('/')
        class TestController extends BaseHttpController {
            @inject('SomeDependency') private readonly _someDependency!: SomeDependency;

            @httpGet('/')
            public async getTest() {
                if (this.httpContext.user !== null) {
                    const {email} = this.httpContext.user.details;
                    const {name} = this._someDependency;
                    const isAuthenticated = await this.httpContext.user.isAuthenticated();
                    expect(isAuthenticated).toEqual(true);
                    return `${ email } & ${ name }`;
                }
                return null;
            }
        }

        const container = new Container();

        container.bind<SomeDependency>('SomeDependency')
        .toConstantValue({name: 'SomeDependency!'});

        const server = new InversifyExpressServer(
            container,
            null,
            null,
            null,
            CustomAuthProvider,
        );

        supertest(server.build())
        .get('/')
        .expect(200, 'SomeDependency!@test.com & SomeDependency!', done);
    });
});
