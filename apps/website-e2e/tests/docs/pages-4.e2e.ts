import { chunk } from '../../support/docs.ts';
import { testDocsPages } from '../../support/docs-suite.ts';

// The docs pages split over four files so four workers check them at once.
testDocsPages(chunk(3, 4));
