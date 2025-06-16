import { z } from "zod";

/* 1. Actors --------------------------------------------------- */

export const Actor = z.enum(["user", "llm", "agent", "tool"]);

/* 2. Attachments --------------------------------------------- */

export const ImageAttachment = z.object({
  type: z.literal("image"),
  mimeType: z.string(),
  url: z.string().url(),
  alt: z.string().optional(),
});

export const DocumentAttachment = z.object({
  type: z.literal("document"),
  mimeType: z.string(),
  url: z.string().url(),
  name: z.string(),
});

export const Attachment = z.union([ImageAttachment, DocumentAttachment]);

/* 3. Rich text / code ---------------------------------------- */

export const MarkdownBlock = z.object({
  type: z.literal("markdown"),
  text: z.string(),
});

export const CodeBlock = z.object({
  type: z.literal("code"),
  language: z.string().optional(),
  code: z.string(),
});

/* 4. User-visible message ------------------------------------ */

export const FormattedContent = z.object({
  type: z.literal("formatted"),
  blocks: z.array(z.union([MarkdownBlock, CodeBlock])).min(1),
});

/* 5. Internal tool call -------------------------------------- */

export const ToolCallContent = z.object({
  type: z.literal("toolCall"),
  name: z.string(),
  params: z.record(z.unknown()),
  display: z.string(), // markdown shown to the user
});

/* 6. Union ---------------------------------------------------- */

export const StrategyContent = z.union([FormattedContent, ToolCallContent]);

/* 7. History entry ------------------------------------------- */

export const HistoryMessage = z.object({
  id: z.string(),
  actor: Actor,
  content: StrategyContent,
  timestamp: z.date(),
  chatId: z.string(),
});

/* 8. Strategy I/O -------------------------------------------- */

export const StrategyRunInput = z.object({
  history: z.array(HistoryMessage).nonempty(),
  context: z.array(Attachment).optional(),
});

export const StrategyRunOutput = z.object({
  actor: Actor,
  content: StrategyContent,
});

/* 9. Type exports -------------------------------------------- */

export type ActorType = z.infer<typeof Actor>;
export type AttachmentType = z.infer<typeof Attachment>;
export type MarkdownBlockType = z.infer<typeof MarkdownBlock>;
export type CodeBlockType = z.infer<typeof CodeBlock>;
export type FormattedContentType = z.infer<typeof FormattedContent>;
export type ToolCallContentType = z.infer<typeof ToolCallContent>;
export type StrategyContentType = z.infer<typeof StrategyContent>;
export type HistoryMessageType = z.infer<typeof HistoryMessage>;
export type StrategyRunInputType = z.infer<typeof StrategyRunInput>;
export type StrategyRunOutputType = z.infer<typeof StrategyRunOutput>;