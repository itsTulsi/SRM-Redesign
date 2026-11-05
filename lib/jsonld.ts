/** JSON for a <script type="application/ld+json">: "<" is escaped so content can never close the tag early. */
export const safeJson = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
