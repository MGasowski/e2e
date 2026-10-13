import type { MDXComponents } from "mdx/types";
import { ModelProvider } from "../snippets/model-provider.jsx";
import { SetupPrompt } from "../snippets/setup-prompt-card.jsx";
import { ShowMore } from "../snippets/show-more.jsx";
import { Video } from "../snippets/video.jsx";
import { VideoCard } from "../snippets/video-card.jsx";
import { Accordion } from "./accordion";
import {
  AccordionGroup,
  Card,
  CardGroup,
  Check,
  DocsLink,
  H2,
  H3,
  H4,
  InfoCallout,
  Note,
  Step,
  Steps,
  Tab,
  Table,
  Tip,
  Warning,
} from "./blocks";
import { CodeBlock } from "./code-block";
import { CodeGroup } from "./code-group";
import { Prompt } from "./prompt";
import { Tabs } from "./tabs";

/** What each tag in a docs page renders as: Mintlify's built-in components, the docs snippets, and the markdown elements. */
export const mdxComponents: MDXComponents = {
  a: DocsLink,
  h2: H2,
  h3: H3,
  h4: H4,
  table: Table,
  Accordion,
  AccordionGroup,
  Card,
  CardGroup,
  Check,
  CodeBlock,
  CodeGroup,
  Info: InfoCallout,
  ModelProvider,
  Note,
  Prompt,
  SetupPrompt,
  ShowMore,
  Step,
  Steps,
  Tab,
  Tabs,
  Tip,
  Video,
  VideoCard,
  Warning,
};
