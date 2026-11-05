def _to_str(x) -> str:
    return x.value if hasattr(x, "value") else str(x)


def get_effective_needs(user, temp_needs=None) -> set[str]:
    """Nhu cầu dài hạn trong hồ sơ + nhu cầu tạm thời của đơn này."""
    base = {_to_str(n) for n in (user.special_needs or [])}
    extra = {_to_str(n) for n in (temp_needs or [])}
    return base | extra