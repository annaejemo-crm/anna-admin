export default function AvtalPublikLayout(props: { children: any }) {
  return (
    <div className="min-h-screen bg-bg py-12 px-4">
      {props.children}
    </div>
  );
}
