// Minimal types for Vue to satisfy the example without installing the package
declare module 'vue' {
    export function ref<T>(value: T): { value: T };
    export function onMounted(callback: () => void): void;
    export function onUnmounted(callback: () => void): void;
}
