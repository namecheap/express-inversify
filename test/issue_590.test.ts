import {Container} from 'inversify';
import {Application} from 'express';
import {InversifyExpressServer, cleanUpMetadata} from '../src/index';
import {NO_CONTROLLERS_FOUND} from '../src/constants';

describe('Issue 590', () => {
    beforeEach(() => {
        cleanUpMetadata();
    });

    it('should throw if no bindings for controllers are declared', () => {
        const container = new Container();
        const server = new InversifyExpressServer(container);
        const throws = (): Application => server.build();
        expect(throws).toThrowError(NO_CONTROLLERS_FOUND);
    });

    it('should not throw if forceControllers is false and no bindings for controllers are declared', () => {
        const container = new Container();
        const server = new InversifyExpressServer(container, null, null, null, null, false);
        const throws = (): Application => server.build();
        expect(throws).not.toThrowError();
    });
});
