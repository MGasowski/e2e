import { chunk } from '../../support/docs.ts';
import { deepPages, testDocsVisuals } from '../../support/docs-suite.ts';

// Every docs page's first screen, split over four files so four workers take them at once.
testDocsVisuals(chunk(3, 4), deepPages);
