export default function Navbar() {
  return (
    <nav className="nav-glass-premium" aria-label="Identidade do site">
      <div className="container-page">
        <div className="flex min-h-[4.25rem] min-w-0 items-center justify-center sm:min-h-[4.5rem]">
          <p
            className="navbar-wordmark cursor-default select-none px-2"
            onCopy={(event) => event.preventDefault()}
            onCut={(event) => event.preventDefault()}
            onContextMenu={(event) => event.preventDefault()}
          >
            Igreja Cristã Evangélica Reformada
          </p>
        </div>
      </div>
    </nav>
  );
}
