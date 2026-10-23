import { cancelPromiseById, listPromises } from "../../data/promises";

export const promiseService = { list: listPromises, cancel: cancelPromiseById };
