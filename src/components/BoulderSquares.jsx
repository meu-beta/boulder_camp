// Renders one square per boulder for a ranking row:
// full gold = TOP, half gold (bottom half) = ZONE, empty = neither.
export default function BoulderSquares({ boulderIds, byBoulder }) {
  return (
    <div className="flex gap-1">
      {boulderIds.map((bid) => {
        const s = byBoulder[bid];
        let cls = 'square square-empty';
        if (s?.top) cls = 'square square-top';
        else if (s?.zone) cls = 'square square-zone';
        return <span key={bid} className={cls} title={`Boulder ${bid}`} />;
      })}
    </div>
  );
}
