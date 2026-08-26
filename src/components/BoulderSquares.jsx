import { boulderScore, participated } from '../lib/scoring';

// Um quadradinho por boulder da fase:
//   dourado cheio  = TOP
//   dourado vazado = ZONA
//   cinza          = escalou e não pontuou
//   contorno fraco = ainda não encarou
export default function BoulderSquares({ boulderIds, byBoulder }) {
  return (
    <div className="flex gap-1">
      {boulderIds.map((id) => {
        const cell = byBoulder?.[id];
        const score = cell?.score ?? null;

        let className = 'square square-empty';
        let title = 'Ainda não encarou';

        if (score) {
          const value = boulderScore(score);
          if (score.top) {
            className = 'square square-top';
            title = `TOP na ${score.top_attempts}ª tentativa — ${value.toFixed(1)} pts`;
          } else if (score.zone) {
            className = 'square square-zone';
            title = `ZONA na ${score.zone_attempts}ª tentativa — ${value.toFixed(1)} pts`;
          } else if (participated(score)) {
            className = 'square square-tried';
            title = 'Escalou sem conquistar zona — 0,0 pts';
          }
        }

        return <span key={id} className={className} title={title} />;
      })}
    </div>
  );
}
