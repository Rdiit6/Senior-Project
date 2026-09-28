'use strict';

// Support contacts and self-help resources, returned in the contract's Resource shape:
// { id, title, description, url, tags }.
// The contract has no phone field, so a phone-only resource is returned as a tel: link.

const toResource = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  url: row.url || `tel:${row.phone.replace(/[^\d+]/g, '')}`,
  tags: row.tags || [],
});

const SELECT = `
  SELECT r.id, r.title, r.description, r.url, r.phone, r.type, r.is_primary_crisis, r.sort_order,
         COALESCE(array_agg(t.code ORDER BY t.code) FILTER (WHERE t.code IS NOT NULL), '{}') AS tags
    FROM resources r
    LEFT JOIN resource_themes rt ON rt.resource_id = r.id
    LEFT JOIN themes t ON t.id = rt.theme_id
   WHERE r.active`;

const ORDER = 'ORDER BY r.is_primary_crisis DESC, r.sort_order, r.title';

function createResources(db) {
  return {
    /** Everything active; primary crisis contact first. */
    async listActive() {
      const { rows } = await db.query(`${SELECT} GROUP BY r.id ${ORDER}`);
      return rows.map(toResource);
    },

    /** Resources tagged with any of the given themes, plus counselling/crisis contacts when support is needed. */
    async match({ themeCodes, needsSupport, limit = 3 }) {
      const { rows } = await db.query(
        `${SELECT}
           AND (
             r.id IN (SELECT rt2.resource_id FROM resource_themes rt2
                        JOIN themes t2 ON t2.id = rt2.theme_id WHERE t2.code = ANY($1::text[]))
             OR ($2 AND r.type IN ('counselling', 'crisis'))
           )
         GROUP BY r.id ${ORDER} LIMIT $3`,
        [themeCodes, needsSupport, limit],
      );
      return rows.map(toResource);
    },
  };
}

module.exports = { createResources, toResource };
