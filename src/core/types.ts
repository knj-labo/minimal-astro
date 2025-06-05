export interface IslandComponent<P = any> {
    (props: P): React.ReactElement;
}

declare global {
    interface Window {
        __ISLANDS__: Record<string, IslandComponent>;
    }
}