import pytest
from src.math_utils import example_pure_function

def test_example_pure_function():
    """
    @probe_id: Math-Req-001
    """
    # 遵循“测试即法律”原则，我们在 AI 填补逻辑前写好测试红绿灯
    assert example_pure_function(2, 3) == 5
    assert example_pure_function(-1, 1) == 0
