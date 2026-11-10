import toast from "react-hot-toast";

export const getErrorMessage = (e) => e.response?.data?.message || e.message || "Terjadi kesalahan";

export async function request(fn, { success } = {}) {
  try {
    const res = await fn();
    if (success) toast.success(success);
    return res.data;
  } catch (e) {
    toast.error(getErrorMessage(e));
    throw e;
  }
}
