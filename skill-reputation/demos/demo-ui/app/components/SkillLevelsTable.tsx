import { SKILL_LEVELS } from "../lib/docsContent";

export function SkillLevelsTable() {
  return (
    <div className="tableWrap docsTable">
      <table>
        <thead>
          <tr>
            <th>Level</th>
            <th>When loaded</th>
            <th>Token cost</th>
            <th>Content</th>
          </tr>
        </thead>
        <tbody>
          {SKILL_LEVELS.map((row) => (
            <tr key={row.level}>
              <td><strong>{row.level}</strong></td>
              <td>{row.whenLoaded}</td>
              <td>{row.tokenCost}</td>
              <td>
                {row.content}
                {row.contentDetail && (
                  <>
                    {" "}
                    (<code>{row.contentDetail}</code>)
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
