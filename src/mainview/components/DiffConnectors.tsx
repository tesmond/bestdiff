export type ConnectorPoint = {
	x: number;
	y: number;
};

export type Connector = {
	id: string;
	fromTop: ConnectorPoint;
	fromBottom: ConnectorPoint;
	toTop: ConnectorPoint;
	toBottom: ConnectorPoint;
	curveStartX: number;
	curveEndX: number;
	color: string;
};

export type DiffConnectorsProps = {
	connectors: Connector[];
};

function buildConnectorAreaPath(connector: Connector): string {
	const { fromTop, fromBottom, toTop, toBottom, curveStartX, curveEndX } = connector;
	const midX = curveStartX + (curveEndX - curveStartX) * 0.5;

	const moveTo = `M ${fromTop.x} ${fromTop.y}`;
	const topStraight = `L ${curveStartX} ${fromTop.y}`;
	const topCurve = `C ${midX} ${fromTop.y}, ${midX} ${toTop.y}, ${curveEndX} ${toTop.y}`;
	const topToRight = `L ${toTop.x} ${toTop.y}`;
	const downRight = `L ${toBottom.x} ${toBottom.y}`;
	const bottomStraight = `L ${curveEndX} ${toBottom.y}`;
	const bottomCurve = `C ${midX} ${toBottom.y}, ${midX} ${fromBottom.y}, ${curveStartX} ${fromBottom.y}`;
	const bottomToLeft = `L ${fromBottom.x} ${fromBottom.y}`;

	return `${moveTo} ${topStraight} ${topCurve} ${topToRight} ${downRight} ${bottomStraight} ${bottomCurve} ${bottomToLeft} Z`;
}

export function DiffConnectors({ connectors }: DiffConnectorsProps) {
	return (
		<svg
			className="pointer-events-none absolute inset-0 h-full w-full"
			aria-hidden="true"
		>
			{connectors.map((connector) => (
				<path
					key={connector.id}
					d={buildConnectorAreaPath(connector)}
					fill={connector.color}
					fillOpacity={0.16}
					stroke={connector.color}
					strokeWidth={1.1}
					strokeOpacity={0.4}
				/>
			))}
		</svg>
	);
}

export { buildConnectorAreaPath };
