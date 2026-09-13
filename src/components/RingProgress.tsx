export default function RingProgress({
  blockIndex,
  blockCount,
}: {
  blockIndex: number;
  blockCount: number;
}) {
  return (
    <div className="segments" aria-hidden="true">
      {Array.from({ length: blockCount }, (_, index) => (
        <span key={index} className={segmentClass(index, blockIndex)} />
      ))}
    </div>
  );
}

function segmentClass(index: number, blockIndex: number): string {
  if (index < blockIndex) return 'segment segment--done';
  if (index === blockIndex) return 'segment segment--active';
  return 'segment';
}
