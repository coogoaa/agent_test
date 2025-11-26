1
一、系统架构总览

┌─────────────────────────────────────────────────────────────────────────────┐
│                         卫星地图输入层                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  RGB 卫星图   │  │   DSM 高程   │  │  建筑矢量    │  │   GIS数据    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         3D屋顶重建引擎                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  屋顶检测    │──▶│  坡面分割   │──▶│  参数提取   │──▶│  3D建模     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         光伏系统设计引擎                                      │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                    组件排布优化模块                                  │     │
│  │  • 可用面积计算  • 遮挡分析  • 间距优化  • 排布方案生成              │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                    电气系统设计模块                                  │     │
│  │  • 组串配置  • 逆变器匹配  • 线缆选型  • 保护配置                    │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                    储能系统配置模块                                  │     │
│  │  • 容量计算  • 充放策略  • 并离网切换  • 生命周期优化                │     │
│  └────────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         发电量模拟与财务分析                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  辐照度模型  │  │  温度修正    │  │  衰减模型    │  │  财务计算    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         三套差异化方案输出                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│  │  经济型方案  │  │  平衡型方案  │  │  高端型方案  │                       │
│  │  最优性价比  │  │  综合最优    │  │  最大收益    │                       │
│  └──────────────┘  └──────────────┘  └──────────────┘                       │
└─────────────────────────────────────────────────────────────────────────────┘


---

二、屋顶3D重建核心参数

2.1 屋顶几何参数提取

class RoofGeometry:
    """屋顶几何参数模型"""
    
    # ==================== 基础几何参数 ====================
    roof_type: str              # 屋顶类型: flat/gable/hip/mansard/shed/complex
    total_area: float           # 总面积 (m²)
    usable_area: float          # 可用面积 (m²) - 扣除障碍物
    
    # ==================== 多坡面参数 ====================
    planes: List[RoofPlane]     # 坡面列表
    
class RoofPlane:
    """单个坡面参数"""
    
    # 几何参数
    plane_id: str               # 坡面ID
    vertices: List[Point3D]     # 顶点坐标列表
    area: float                 # 坡面面积 (m²)
    
    # 朝向参数 (关键!)
    azimuth: float              # 方位角 (°) - 正南=180°, 正东=90°, 正西=270°
    tilt: float                 # 倾斜角 (°) - 水平=0°, 垂直=90°
    
    # 尺寸参数
    length: float               # 沿屋脊方向长度 (m)
    width: float                # 垂直屋脊方向宽度 (m)
    ridge_height: float         # 屋脊高度 (m)
    eave_height: float          # 屋檐高度 (m)
    
    # 边界退缩 (安全距离)
    edge_setback: Dict = {
        'ridge': 0.3,           # 屋脊退缩 (m)
        'eave': 0.5,            # 屋檐退缩 (m)  
        'rake': 0.3,            # 斜边退缩 (m)
        'valley': 0.3,          # 天沟退缩 (m)
        'hip': 0.3              # 斜脊退缩 (m)
    }

2.2 障碍物与遮挡分析

class ObstacleAnalysis:
    """障碍物与遮挡分析"""
    
    # ==================== 屋顶障碍物 ====================
    obstacles: List[Obstacle] = [
        # 烟囱
        {'type': 'chimney', 'position': (x,y), 'size': (w,h), 
         'height': 1.5, 'buffer_zone': 1.0},  # 周围缓冲区
        
        # 天窗
        {'type': 'skylight', 'position': (x,y), 'size': (w,h),
         'buffer_zone': 0.5},
        
        # 通风口
        {'type': 'vent', 'position': (x,y), 'diameter': 0.3,
         'height': 0.5, 'buffer_zone': 0.3},
        
        # 卫星天线
        {'type': 'antenna', 'position': (x,y), 'height': 1.0,
         'buffer_zone': 0.5},
        
        # 空调外机
        {'type': 'hvac', 'position': (x,y), 'size': (w,h,d),
         'buffer_zone': 0.8},
    ]
    
    # ==================== 周边遮挡物 ====================
    external_shading: List[ShadingObject] = [
        # 邻近建筑
        {'type': 'building', 'distance': 15, 'height': 12,
         'azimuth_range': (160, 200)},
        
        # 树木
        {'type': 'tree', 'distance': 8, 'height': 10,
         'crown_diameter': 6, 'deciduous': True},  # 落叶树
        
        # 电线杆
        {'type': 'pole', 'distance': 5, 'height': 8,
         'azimuth': 175},
    ]
    
    def calculate_shading_loss(self, 
                               latitude: float,
                               date_range: Tuple,
                               time_step: int = 15) -> np.ndarray:
        """
        计算逐时遮挡损失矩阵
        
        Returns:
            shading_matrix: shape=(365, 96) 全年15分钟级遮挡因子
        """
        # 太阳轨迹计算
        sun_positions = self._calculate_sun_path(latitude, date_range)
        
        # 逐点遮挡分析
        shading_matrix = np.ones((365, 96))
        
        for day in range(365):
            for slot in range(96):
                sun_azimuth, sun_elevation = sun_positions[day, slot]
                
                # 检查每个遮挡物
                for obstacle in self.external_shading:
                    if self._is_shaded(obstacle, sun_azimuth, sun_elevation):
                        # 计算遮挡比例
                        shade_factor = self._calculate_shade_factor(
                            obstacle, sun_azimuth, sun_elevation
                        )
                        shading_matrix[day, slot] *= (1 - shade_factor)
        
        return shading_matrix

2.3 太阳辐照度计算

class IrradianceModel:
    """辐照度计算模型"""
    
    def __init__(self, latitude: float, longitude: float):
        self.latitude = latitude
        self.longitude = longitude
        
    def calculate_poa_irradiance(self,
                                  tilt: float,
                                  azimuth: float,
                                  ghi: np.ndarray,      # 水平总辐照
                                  dni: np.ndarray,      # 直射辐照
                                  dhi: np.ndarray,      # 散射辐照
                                  albedo: float = 0.2   # 地面反射率
                                  ) -> np.ndarray:
        """
        计算倾斜面辐照度 (POA - Plane of Array)
        
        使用 Perez 模型分解:
        POA = POA_beam + POA_sky_diffuse + POA_ground_diffuse
        """
        
        # 计算太阳位置
        solar_zenith, solar_azimuth = self._get_solar_position()
        
        # 入射角计算
        aoi = self._calculate_aoi(tilt, azimuth, solar_zenith, solar_azimuth)
        
        # 直射分量
        poa_beam = dni * np.cos(np.radians(aoi))
        poa_beam = np.maximum(poa_beam, 0)  # 负值归零
        
        # 天空散射分量 (Perez模型)
        poa_sky_diffuse = self._perez_diffuse(dhi, dni, solar_zenith, tilt, aoi)
        
        # 地面反射分量
        poa_ground = ghi * albedo * (1 - np.cos(np.radians(tilt))) / 2
        
        poa_total = poa_beam + poa_sky_diffuse + poa_ground
        
        return poa_total
    
    # ==================== 不同朝向的年发电量系数 ====================
    ORIENTATION_FACTORS = {
        # (tilt, azimuth): factor  (以正南0°倾角最优=1.0为基准)
        # 北半球示例 (纬度30-40°)
        
        # 正南 (azimuth=180°)
        (0, 180): 0.87,    # 水平
        (15, 180): 0.96,   # 15° 倾角
        (30, 180): 1.00,   # 最优 (约等于纬度角)
        (45, 180): 0.97,
        (60, 180): 0.88,
        (90, 180): 0.56,   # 垂直立面
        
        # 东/西向 (azimuth=90°/270°)
        (30, 90): 0.82,    # 正东30°
        (30, 270): 0.82,   # 正西30°
        
        # 东南/西南 (azimuth=135°/225°)
        (30, 135): 0.95,
        (30, 225): 0.95,
        
        # 正北 (azimuth=0°/360°) - 不推荐
        (30, 0): 0.58,
    }


---

三、光伏组件核心参数

3.1 组件电气参数 (STC条件)

class PVModuleParameters:
    """
    光伏组件参数
    STC条件: 辐照度1000W/m², 电池温度25°C, AM1.5光谱
    """
    
    # ==================== 基础信息 ====================
    manufacturer: str           # 制造商
    model: str                  # 型号
    cell_type: str              # 电池类型: mono-PERC/TOPCon/HJT/IBC
    cell_count: int             # 电池片数量 (如 144半片)
    
    # ==================== STC 电气参数 (核心!) ====================
    
    # 功率参数
    pmax_stc: float             # 最大功率 Pmax (W) - 如 580W
    pmax_tolerance: Tuple       # 功率公差 (%) - 如 (0, +5)
    
    # 电压参数 (组串设计关键!)
    voc_stc: float              # 开路电压 Voc (V) - 如 51.7V
    vmp_stc: float              # 最大功率点电压 Vmp (V) - 如 43.5V
    
    # 电流参数 (组串设计关键!)
    isc_stc: float              # 短路电流 Isc (A) - 如 14.10A
    imp_stc: float              # 最大功率点电流 Imp (A) - 如 13.34A
    
    # 效率
    efficiency: float           # 组件效率 (%) - 如 22.5%
    
    # ==================== 温度系数 (极端温度设计关键!) ====================
    temp_coef_pmax: float       # Pmax温度系数 (%/°C) - 如 -0.30%
    temp_coef_voc: float        # Voc温度系数 (%/°C) - 如 -0.25%  ⚠️ 负值!
    temp_coef_isc: float        # Isc温度系数 (%/°C) - 如 +0.04%  ⚠️ 正值!
    
    # ==================== NOCT 参数 ====================
    noct: float                 # 标称工作温度 (°C) - 如 43°C
    # NOCT条件: 辐照800W/m², 环境温度20°C, 风速1m/s
    
    # ==================== 物理尺寸 ====================
    length: float               # 长度 (mm) - 如 2278
    width: float                # 宽度 (mm) - 如 1134
    thickness: float            # 厚度 (mm) - 如 35
    weight: float               # 重量 (kg) - 如 32.8
    
    # ==================== 系统电压等级 ====================
    max_system_voltage: float   # 最大系统电压 (V) - 如 1500V DC
    
    # ==================== 机械载荷 ====================
    wind_load: float            # 风载荷 (Pa) - 如 2400Pa
    snow_load: float            # 雪载荷 (Pa) - 如 5400Pa
    
    # ==================== 衰减参数 ====================
    degradation_year1: float    # 首年衰减 (%) - 如 2%
    degradation_annual: float   # 年衰减率 (%) - 如 0.4%
    warranty_power_25y: float   # 25年功率保证 (%) - 如 87.4%
    
    # ==================== 温度修正计算方法 ====================
    def calculate_cell_temperature(self, 
                                   ambient_temp: float,    # 环境温度 (°C)
                                   irradiance: float       # 辐照度 (W/m²)
                                   ) -> float:
        """计算电池温度"""
        t_cell = ambient_temp + (self.noct - 20) * irradiance / 800
        return t_cell
    
    def get_voc_at_temp(self, cell_temp: float) -> float:
        """计算指定温度下的开路电压"""
        delta_t = cell_temp - 25  # 与STC温差
        voc = self.voc_stc * (1 + self.temp_coef_voc/100 * delta_t)
        return voc
    
    def get_vmp_at_temp(self, cell_temp: float) -> float:
        """计算指定温度下的最大功率点电压"""
        delta_t = cell_temp - 25
        # Vmp温度系数近似等于Voc温度系数
        vmp = self.vmp_stc * (1 + self.temp_coef_voc/100 * delta_t)
        return vmp
    
    def get_isc_at_temp(self, cell_temp: float) -> float:
        """计算指定温度下的短路电流"""
        delta_t = cell_temp - 25
        isc = self.isc_stc * (1 + self.temp_coef_isc/100 * delta_t)
        return isc

3.2 组件排布计算

# 修改文件：3.2 组件排布计算
# 类：ModuleLayoutEngine

def optimize_layout(self, 
                   roof_plane: RoofPlane, 
                   module: PVModuleParameters,
                   orientation: str = 'portrait' # 澳洲市场默认且强烈推荐竖向
                   ) -> LayoutResult:
    """
    优化组件排布 (澳洲市场适配版)
    """
    # 1. 澳洲安规检查：倾角限制
    # 虽然屋顶倾角是固定的，但安装支架时需确保最终角度合规
    install_tilt = roof_plane.tilt
    if install_tilt > 30:
        # 实际逻辑可能需要报警或建议使用平铺支架
        pass 

    # 2. 强制竖向排列逻辑 (除非显式要求横向，否则覆盖为竖向)
    # 专家建议：纵向安装更省材料，安装商一般都会纵向安装
    if orientation != 'landscape':
        orientation = 'portrait'

    # 组件尺寸转换
    if orientation == 'portrait':
        mod_length = module.length / 1000 
        mod_width = module.width / 1000
    else:
        mod_length = module.width / 1000
        mod_width = module.length / 1000

    # ... (保留原有的可用区域计算代码: usable_length, usable_width) ...
    
    # 可用区域 (扣除退缩)
    usable_length = roof_plane.length - roof_plane.edge_setback['ridge'] - roof_plane.edge_setback['eave']
    usable_width = roof_plane.width - 2 * roof_plane.edge_setback['rake']

    # 组件间隙 (澳洲常用夹具，间隙保持 2cm)
    gap_horizontal = 0.02 
    gap_vertical = 0.02

    # ... (保留原有的行列计算与障碍物规避逻辑) ...
    
    cols = int((usable_width + gap_horizontal) / (mod_width + gap_horizontal))
    rows = int((usable_length + gap_vertical) / (mod_length + gap_vertical))

    module_positions = self._place_modules_avoiding_obstacles(
        rows, cols, roof_plane.obstacles
    )

    return LayoutResult(
        module_count=len(module_positions),
        positions=module_positions,
        rows=rows,
        cols=cols,
        coverage_ratio=len(module_positions) * mod_length * mod_width / roof_plane.area
    )


---

四、逆变器核心参数与匹配

4.1 逆变器参数模型

class InverterParameters:
    """逆变器参数模型"""
    
    # ==================== 基础信息 ====================
    manufacturer: str           # 制造商
    model: str                  # 型号
    type: str                   # 类型: string/micro/hybrid
    
    # ==================== 直流侧参数 (组串设计核心!) ====================
    
    # 电压参数
    vdc_max: float              # 最大直流电压 (V) - 如 600V
    vdc_start: float            # 启动电压 (V) - 如 120V ⚠️ 组串最低电压
    vdc_mppt_min: float         # MPPT最低电压 (V) - 如 90V
    vdc_mppt_max: float         # MPPT最高电压 (V) - 如 550V ⚠️ 组串电压范围
    vdc_nominal: float          # 额定直流电压 (V) - 如 360V
    
    # 电流参数
    idc_max_per_mppt: float     # 单MPPT最大输入电流 (A) - 如 15A
    idc_max_total: float        # 总最大直流电流 (A) - 如 30A
    isc_max_per_mppt: float     # 单MPPT最大短路电流 (A) - 如 20A
    
    # 功率参数
    pdc_max: float              # 最大直流输入功率 (W) - 如 8000W
    
    # MPPT配置
    mppt_count: int             # MPPT数量 - 如 2
    strings_per_mppt: int       # 每MPPT组串数 - 如 2
    total_string_inputs: int    # 总组串输入数 - 如 4
    
    # ==================== 交流侧参数 ====================
    
    pac_nominal: float          # 额定输出功率 (W) - 如 6000W
    pac_max: float              # 最大输出功率 (W) - 如 6600W
    vac_nominal: float          # 额定交流电压 (V) - 如 230V
    vac_range: Tuple            # 交流电压范围 (V) - 如 (180, 270)
    iac_max: float              # 最大输出电流 (A) - 如 28.7A
    frequency: float            # 频率 (Hz) - 如 50Hz
    power_factor: float         # 功率因数 - 如 >0.99
    
    # ==================== 效率参数 ====================
    efficiency_max: float       # 最大效率 (%) - 如 98.4%
    efficiency_euro: float      # 欧洲效率 (%) - 如 97.8%
    efficiency_cec: float       # CEC效率 (%) - 如 97.5%
    
    # 效率曲线 (用于精确发电量计算)
    efficiency_curve: Dict = {
        # 负载率: 效率
        0.05: 0.85,
        0.10: 0.92,
        0.20: 0.96,
        0.30: 0.974,
        0.50: 0.982,
        0.75: 0.984,
        1.00: 0.980,
        1.10: 0.975,  # 过载区
    }
    
    # ==================== 混合逆变器特有参数 ====================
    # (用于储能系统)
    battery_voltage_range: Tuple   # 电池电压范围 (V) - 如 (40, 60)
    max_charge_current: float      # 最大充电电流 (A) - 如 100A
    max_discharge_current: float   # 最大放电电流 (A) - 如 100A
    backup_power: float            # 备电功率 (W) - 如 6000W
    
    # ==================== 保护参数 ====================
    dc_switch: bool             # 内置直流开关
    anti_islanding: bool        # 防孤岛保护
    surge_protection: str       # 浪涌保护等级
    
    # ==================== 环境参数 ====================
    operating_temp_range: Tuple # 工作温度范围 (°C) - 如 (-25, 60)
    derating_temp: float        # 降额起始温度 (°C) - 如 45°C
    ip_rating: str              # 防护等级 - 如 IP65

4.2 组串配置计算

# 修改文件：4.2 组串配置计算
# 类：StringConfigurationEngine

def validate_string_configuration(self,
                                string_size: int,
                                strings_count: int,
                                mppt_assignment: List[int],
                                has_battery: bool = False # 新增参数：是否有电池
                                ) -> ValidationResult:
    """
    验证组串配置的合规性 (澳洲市场适配版)
    """
    errors = []
    warnings = []

    # ... (保留原有的电压/电流检查逻辑: voc_at_min_temp, vmp_at_max_temp, isc 等) ...

    # ==================== 功率与容配比检查 (核心修改) ====================
    total_dc_power = self.module.pmax_stc * string_size * strings_count
    
    # 计算容配比
    dc_ac_ratio = total_dc_power / self.inverter.pac_nominal
    
    # 澳洲市场规则阈值
    # 1. 不带电池: 限制在 1.33 (CEC规定)
    # 2. 带电池 (Hybrid): 允许超配到 1.5 - 2.0 (利用电池吸收削峰能量)
    max_ratio_limit = 2.0 if has_battery else 1.33
    optimal_ratio_limit = 1.5 if has_battery else 1.2

    if dc_ac_ratio > max_ratio_limit:
        # 严重警告
        limit_desc = "200% (含储能)" if has_battery else "133% (无储能)"
        warnings.append(f"⚡ 容配比 {dc_ac_ratio:.2f} 过高。澳洲标准限制: {limit_desc}")
    
    elif dc_ac_ratio < 1.0:
        # 澳洲人工贵，通常希望装满逆变器容量，过低是不经济的
        warnings.append(f"⚡ 容配比 {dc_ac_ratio:.2f} 偏低，建议增加组件以摊薄安装成本")

    # 功率绝对值检查 (保留)
    if total_dc_power > self.inverter.pdc_max:
         errors.append(f"⚠️ 总直流功率 {total_dc_power}W 超过逆变器最大输入 {self.inverter.pdc_max}W")

    return ValidationResult(
        is_valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        parameters={
            'dc_ac_ratio': dc_ac_ratio,
            'total_dc_power': total_dc_power,
            # ... 其他参数
        }
    )

4.3 多MPPT优化策略

class MPPTOptimizer:
    """多MPPT优化分配"""
    
    def optimize_mppt_assignment(self,
                                  roof_planes: List[RoofPlane],
                                  module_layouts: Dict[str, LayoutResult],
                                  inverter: InverterParameters
                                  ) -> MPPTAssignment:
        """
        优化多坡面到MPPT的分配
        
        原则:
        1. 同一MPPT上的组串应具有相似的朝向和倾角
        2. 差异大的坡面应分配到不同MPPT
        3. 各MPPT负载尽量均衡
        """
        
        # 计算各坡面的等效发电指数
        plane_indices = []
        for plane in roof_planes:
            # 综合考虑朝向、倾角、遮挡
            generation_index = self._calculate_generation_index(plane)
            plane_indices.append({
                'plane_id': plane.plane_id,
                'azimuth': plane.azimuth,
                'tilt': plane.tilt,
                'generation_index': generation_index,
                'module_count': module_layouts[plane.plane_id].module_count
            })
        
        # 聚类分组 (相似朝向分到同一MPPT)
        clusters = self._cluster_by_orientation(plane_indices, inverter.mppt_count)
        
        # 分配验证
        assignment = []
        for mppt_idx, cluster in enumerate(clusters):
            strings_on_mppt = sum(p['module_count'] for p in cluster) // self.optimal_string_size
            
            # 检查是否超过单MPPT组串数限制
            if strings_on_mppt > inverter.strings_per_mppt:
                # 需要重新分配或选择更大逆变器
                pass
            
            assignment.append({
                'mppt_index': mppt_idx,
                'planes': [p['plane_id'] for p in cluster],
                'strings_count': strings_on_mppt,
                'total_power': sum(p['module_count'] * self.module.pmax_stc for p in cluster)
            })
        
        return MPPTAssignment(assignments=assignment)


---

五、储能电池核心参数

5.1 电池参数模型

class BatteryParameters:
    """储能电池参数模型"""
    
    # ==================== 基础信息 ====================
    manufacturer: str           # 制造商
    model: str                  # 型号
    chemistry: str              # 电池化学类型: LFP/NMC/NCA
    
    # ==================== 容量参数 ====================
    nominal_capacity: float     # 标称容量 (kWh) - 如 10.24 kWh
    usable_capacity: float      # 可用容量 (kWh) - 如 9.2 kWh
    
    # ==================== 放电深度 DoD (关键!) ====================
    dod_max: float              # 最大放电深度 (%) - 如 90%
    dod_recommended: float      # 推荐放电深度 (%) - 如 80%
    # 可用容量 = 标称容量 × DoD
    
    # ==================== 效率参数 ====================
    round_trip_efficiency: float    # 往返效率 (%) - 如 95%
    # 往返效率 = 放电能量 / 充电能量
    
    charge_efficiency: float        # 充电效率 (%) - 如 97.5%
    discharge_efficiency: float     # 放电效率 (%) - 如 97.5%
    # round_trip = charge_eff × discharge_eff
    
    self_discharge_rate: float      # 自放电率 (%/月) - 如 2%
    
    # ==================== 功率参数 ====================
    max_charge_power: float         # 最大充电功率 (kW) - 如 5kW
    max_discharge_power: float      # 最大放电功率 (kW) - 如 5kW
    continuous_power: float         # 持续输出功率 (kW) - 如 4.6kW
    peak_power: float               # 峰值功率 (kW) - 如 7kW (持续时间有限)
    peak_duration: float            # 峰值持续时间 (s) - 如 10s
    
    # ==================== 电气参数 ====================
    nominal_voltage: float          # 标称电压 (V) - 如 51.2V
    voltage_range: Tuple            # 电压范围 (V) - 如 (42, 58)
    max_charge_current: float       # 最大充电电流 (A) - 如 100A
    max_discharge_current: float    # 最大放电电流 (A) - 如 100A
    
    # ==================== 循环寿命 (关键!) ====================
    cycle_life: int                 # 循环次数 - 如 6000次@80%DoD
    cycle_life_dod: float           # 对应DoD - 如 80%
    calendar_life: int              # 日历寿命 (年) - 如 15年
    
    # 循环寿命与DoD关系 (可选的详细数据)
    cycle_life_curve: Dict = {
        # DoD: 循环次数
        0.10: 50000,
        0.20: 25000,
        0.50: 10000,
        0.80: 6000,
        0.90: 4000,
        1.00: 3000,
    }
    
    # ==================== 容量衰减 ====================
    capacity_retention_eol: float   # 寿命终止容量保持 (%) - 如 70%
    # 循环 cycle_life 次后，容量降至 70%
    
    # ==================== 温度参数 ====================
    operating_temp_range: Tuple     # 工作温度范围 (°C) - 如 (0, 45)
    optimal_temp_range: Tuple       # 最佳温度范围 (°C) - 如 (15, 35)
    storage_temp_range: Tuple       # 存储温度范围 (°C) - 如 (-10, 45)
    
    # 温度对性能的影响
    temp_capacity_curve: Dict = {
        # 温度(°C): 容量系数
        -10: 0.70,
        0: 0.85,
        10: 0.92,
        25: 1.00,
        35: 0.98,
        45: 0.95,
    }
    
    # ==================== 物理参数 ====================
    dimensions: Tuple               # 尺寸 (mm) - (W, H, D)
    weight: float                   # 重量 (kg) - 如 114kg
    ip_rating: str                  # 防护等级 - 如 IP65
    installation_type: str          # 安装方式: wall/floor/outdoor
    
    # ==================== 安全认证 ====================
    certifications: List[str]       # 认证列表: ['UL9540A', 'IEC62619', 'UN38.3']

5.2 储能容量计算

class BatteryCapacityCalculator:
    """储能容量计算器"""
    
    def calculate_optimal_capacity(self,
                                   pv_system_size: float,       # 光伏装机 (kW)
                                   annual_generation: float,    # 年发电量 (kWh)
                                   load_profile: LoadProfile,   # 用电曲线
                                   electricity_tariff: Tariff,  # 电价结构
                                   ) -> CapacityRecommendation:
        """
        计算推荐储能容量
        """
        
        # ==================== 方法1: 基于自发自用率优化 ====================
        
        # 无储能时的自发自用率
        base_self_consumption = self._calculate_self_consumption(
            generation_profile=self._get_generation_profile(pv_system_size),
            load_profile=load_profile,
            battery_capacity=0
        )
        
        # 不同容量的自发自用率
        capacity_scenarios = []
        for capacity in np.arange(0, pv_system_size * 3, 0.5):
            self_consumption = self._calculate_self_consumption(
                generation_profile=self._get_generation_profile(pv_system_size),
                load_profile=load_profile,
                battery_capacity=capacity
            )
            
            # 边际效益递减
            marginal_benefit = (self_consumption - base_self_consumption) / max(capacity, 0.1)
            
            capacity_scenarios.append({
                'capacity': capacity,
                'self_consumption_rate': self_consumption,
                'marginal_benefit': marginal_benefit
            })
        
        # ==================== 方法2: 基于日用电量 ====================
        
        daily_consumption = load_profile.daily_average  # 日均用电量 (kWh)
        evening_consumption = load_profile.evening_peak  # 傍晚高峰用电 (kWh)
        
        # 经验公式
        recommended_by_daily = daily_consumption * 0.3  # 日用电30%
        recommended_by_evening = evening_consumption * 1.5  # 覆盖傍晚高峰
        
        # ==================== 方法3: 基于峰谷套利 ====================
        
        if electricity_tariff.has_tou:  # 有峰谷电价
            peak_valley_spread = electricity_tariff.peak_rate - electricity_tariff.valley_rate
            
            # 每kWh储能的日收益
            daily_profit_per_kwh = peak_valley_spread * 0.9  # 考虑效率
            
            # 经济最优容量 (简化计算)
            recommended_by_arbitrage = evening_consumption * 0.8
        else:
            recommended_by_arbitrage = 0
        
        # ==================== 综合推荐 ====================
        
        return CapacityRecommendation(
            recommended_capacity=max(recommended_by_daily, recommended_by_evening),
            capacity_scenarios=capacity_scenarios,
            methods_detail={
                'by_daily_consumption': recommended_by_daily,
                'by_evening_peak': recommended_by_evening,
                'by_arbitrage': recommended_by_arbitrage,
            },
            self_consumption_improvement={
                'without_battery': base_self_consumption,
                'with_recommended': capacity_scenarios[int(recommended_by_evening/0.5)]['self_consumption_rate'] if recommended_by_evening > 0 else base_self_consumption
            }
        )
    
    def calculate_battery_lifecycle(self,
                                    battery: BatteryParameters,
                                    usage_profile: BatteryUsageProfile
                                    ) -> LifecycleAnalysis:
        """
        计算电池生命周期
        """
        
        # 年等效循环次数
        annual_cycles = usage_profile.daily_cycles * 365
        
        # 考虑DoD对寿命的影响
        effective_cycles = annual_cycles * self._dod_impact_factor(
            battery.cycle_life_curve,
            usage_profile.average_dod
        )
        
        # 预计寿命年数
        cycle_limited_life = battery.cycle_life / effective_cycles
        calendar_limited_life = battery.calendar_life
        
        expected_life = min(cycle_limited_life, calendar_limited_life)
        
        # 容量衰减曲线
        capacity_curve = []
        for year in range(int(expected_life) + 1):
            cycles_completed = effective_cycles * year
            remaining_capacity = self._calculate_remaining_capacity(
                battery, cycles_completed
            )
            capacity_curve.append({
                'year': year,
                'remaining_capacity_pct': remaining_capacity,
                'usable_kwh': battery.usable_capacity * remaining_capacity / 100
            })
        
        return LifecycleAnalysis(
            expected_life_years=expected_life,
            limiting_factor='cycles' if cycle_limited_life < calendar_limited_life else 'calendar',
            annual_equivalent_cycles=effective_cycles,
            capacity_degradation_curve=capacity_curve,
            replacement_year=int(expected_life) + 1
        )

5.3 储能控制策略

class BatteryControlStrategy:
    """储能控制策略"""
    
    # ==================== 策略1: 自发自用优先 ====================
    @staticmethod
    def self_consumption_first(pv_power: float,
                                load_power: float,
                                battery_soc: float,
                                battery: BatteryParameters
                                ) -> BatteryCommand:
        """
        自发自用优先模式
        
        逻辑:
        - 光伏 > 负载: 多余电量充电池
        - 光伏 < 负载: 电池放电补充
        """
        surplus = pv_power - load_power
        
        if surplus > 0:
            # 有余电，充电
            charge_power = min(surplus, battery.max_charge_power)
            if battery_soc >= 1.0:  # 已满
                charge_power = 0
            return BatteryCommand(action='charge', power=charge_power)
        else:
            # 缺电，放电
            deficit = -surplus
            discharge_power = min(deficit, battery.max_discharge_power)
            min_soc = 1 - battery.dod_max
            if battery_soc <= min_soc:  # 已空
                discharge_power = 0
            return BatteryCommand(action='discharge', power=discharge_power)
    
    # ==================== 策略2: 峰谷套利 ====================
    @staticmethod
    def time_of_use_arbitrage(current_time: datetime,
                               tariff: Tariff,
                               battery_soc: float,
                               battery: BatteryParameters
                               ) -> BatteryCommand:
        """
        峰谷电价套利模式
        
        逻辑:
        - 谷时(低电价): 充电
        - 峰时(高电价): 放电
        """
        current_rate = tariff.get_rate(current_time)
        
        if current_rate == 'valley':
            # 谷时充电
            if battery_soc < 0.95:
                return BatteryCommand(action='charge', power=battery.max_charge_power)
        elif current_rate == 'peak':
            # 峰时放电
            min_soc = 1 - battery.dod_max
            if battery_soc > min_soc:
                return BatteryCommand(action='discharge', power=battery.max_discharge_power)
        
        return BatteryCommand(action='idle', power=0)
    
    # ==================== 策略3: 备电优先 ====================
    @staticmethod  
    def backup_priority(pv_power: float,
                        load_power: float,
                        battery_soc: float,
                        battery: BatteryParameters,
                        backup_reserve: float = 0.2  # 保留20%用于备电
                        ) -> BatteryCommand:
        """
        备电优先模式
        
        始终保留一定电量用于停电备用
        """
        usable_soc = battery_soc - backup_reserve
        
        if usable_soc <= 0:
            # 低于备用线，仅充电
            surplus = pv_power - load_power
            if surplus > 0:
                return BatteryCommand(action='charge', power=min(surplus, battery.max_charge_power))
            return BatteryCommand(action='idle', power=0)
        
        # 正常自发自用逻辑
        return BatteryControlStrategy.self_consumption_first(
            pv_power, load_power, usable_soc, battery
        )


---

六、发电量模拟与损耗计算

6.1 系统损耗模型

class SystemLossModel:
    """系统损耗模型"""
    
    # ==================== 损耗类型及典型值 ====================
    
    LOSS_FACTORS = {
        # 组件相关损耗
        'soiling': 0.02,                # 灰尘遮挡 2%
        'shading': 0.03,                # 周边遮挡 3% (需根据实际计算)
        'snow': 0.00,                   # 积雪 (视地区)
        'module_mismatch': 0.02,        # 组件失配 2%
        'module_degradation': 0.00,     # 首年衰减 (单独计算)
        'lid_loss': 0.015,              # LID光致衰减 1.5% (仅首年)
        
        # 电气损耗
        'dc_wiring': 0.02,              # 直流线缆损耗 2%
        'ac_wiring': 0.01,              # 交流线缆损耗 1%
        'connection_loss': 0.005,       # 连接器损耗 0.5%
        
        # 逆变器损耗
        'inverter_efficiency': 0.03,    # 逆变器损耗 3% (含效率曲线)
        'mppt_efficiency': 0.005,       # MPPT效率损耗 0.5%
        'clipping': 0.00,               # 限幅损耗 (需计算)
        
        # 系统损耗
        'availability': 0.005,          # 可用性损耗 0.5%
        'grid_curtailment': 0.00,       # 弃光 (视政策)
        'transformer': 0.00,            # 变压器 (户用无)
    }
    
    def calculate_total_loss(self, 
                             specific_losses: Dict = None
                             ) -> Tuple[float, Dict]:
        """
        计算总损耗
        
        Returns:
            derate_factor: 总折减系数 (如 0.85 表示85%有效)
            loss_breakdown: 各项损耗明细
        """
        losses = self.LOSS_FACTORS.copy()
        
        # 更新特定项目的损耗
        if specific_losses:
            losses.update(specific_losses)
        
        # 计算综合损耗 (串联相乘)
        derate_factor = 1.0
        for loss_name, loss_value in losses.items():
            derate_factor *= (1 - loss_value)
        
        return derate_factor, losses
    
    def calculate_temperature_derate(self,
                                      module: PVModuleParameters,
                                      ambient_temp: float,
                                      irradiance: float
                                      ) -> float:
        """
        温度折减计算
        
        Returns:
            temp_derate: 温度折减系数
        """
        # 计算电池温度
        cell_temp = module.calculate_cell_temperature(ambient_temp, irradiance)
        
        # 温度偏离STC
        delta_t = cell_temp - 25
        
        # 功率温度系数 (通常为负)
        temp_derate = 1 + (module.temp_coef_pmax / 100) * delta_t
        
        return max(temp_derate, 0.5)  # 最低50%

6.2 年发电量计算

# 修改文件：6.2 年发电量计算
# 类：EnergyYieldCalculator

def calculate_annual_yield(self,
                          system_config: SystemConfiguration,
                          weather_data: WeatherData,
                          ) -> AnnualYieldResult:
    
    hourly_results = []
    
    # 初始化电池状态 (如果存在)
    current_battery_soc = 0.0 # 假设初始为空或根据策略设定
    battery_capacity_kwh = system_config.battery.usable_capacity if system_config.has_battery else 0

    for timestamp, weather in weather_data.iterrows():
        # ... (保留 1-4 步：计算 POA, IAM, 温度折减, DC Power) ...
        
        # 4. 应用系统损耗 (得到直流侧可用功率)
        derate_factor, _ = self.loss_model.calculate_total_loss()
        dc_power_available = dc_power * derate_factor # 此时是 W

        # ==================== 5. 逆变器与电池充电逻辑 (核心修改) ====================
        
        ac_power = 0
        clipping_loss = 0
        battery_charge_power = 0
        
        # 逆变器额定输出 (AC限制)
        inverter_ac_limit = system_config.inverter.pac_nominal
        
        if system_config.inverter.type == 'hybrid' and system_config.has_battery:
            # --- 混合逆变器逻辑 ---
            
            # A. 优先满足 AC 输出 (供给负载和电网)
            # 估算所需的 DC 功率来产生满载 AC (考虑逆变效率)
            inv_efficiency = self._get_inverter_efficiency(system_config.inverter, 1.0)
            dc_needed_for_max_ac = inverter_ac_limit / inv_efficiency
            
            if dc_power_available > dc_needed_for_max_ac:
                # 直流功率过剩，AC 输出拉满
                ac_power = inverter_ac_limit
                
                # B. 剩余的直流电用于给电池充电 (DC-Coupling)
                # 这部分能量原本会被 Clip 掉
                excess_dc = dc_power_available - dc_needed_for_max_ac
                
                # 检查电池充电能力和剩余容量
                max_charge = system_config.battery.max_charge_power * 1000 # kW -> W
                # 简单模拟电池充电 (实际应调用 BatteryControlStrategy)
                charge_power = min(excess_dc, max_charge)
                
                # 更新电池电量 (简化版，需结合时间步长)
                # current_battery_soc += ... 
                
                battery_charge_power = charge_power
                
                # C. 真正的限幅损失 (电池也吃不下的)
                clipping_loss = excess_dc - charge_power
                
            else:
                # 直流功率不足以满载，全部转为 AC
                # 此时效率需根据负载率动态计算
                load_ratio = dc_power_available / inverter_ac_limit
                eff = self._get_inverter_efficiency(system_config.inverter, load_ratio)
                ac_power = dc_power_available * eff
                clipping_loss = 0
                
        else:
            # --- 传统组串逆变器逻辑 (原代码逻辑) ---
            load_ratio = dc_power_available / inverter_ac_limit
            inverter_efficiency = self._get_inverter_efficiency(system_config.inverter, load_ratio)
            ac_power_raw = dc_power_available * inverter_efficiency
            
            if ac_power_raw > inverter_ac_limit:
                clipping_loss = ac_power_raw - inverter_ac_limit
                ac_power = inverter_ac_limit
            else:
                ac_power = ac_power_raw
                clipping_loss = 0

        hourly_results.append({
            'timestamp': timestamp,
            'dc_power': dc_power_available,
            'ac_power': ac_power,
            'battery_charge_from_clip': battery_charge_power, # 新增记录
            'clipping_loss': clipping_loss
        })

    return AnnualYieldResult(hourly_results)


---

七、财务分析模型

7.1 投资回报计算

class FinancialAnalysis:
    """财务分析模型"""
    
    def __init__(self,
                 system_cost: float,           # 系统总成本
                 annual_yield: float,          # 年发电量 (kWh)
                 electricity_rate: float,      # 电价 (元/kWh)
                 feed_in_tariff: float = 0,    # 上网电价 (元/kWh)
                 self_consumption_rate: float = 0.3,  # 自用比例
                 annual_maintenance: float = 0,  # 年维护费
                 discount_rate: float = 0.05,    # 折现率
                 inflation_rate: float = 0.02,   # 通胀率
                 electricity_price_increase: float = 0.03,  # 电价年增长率
                 analysis_period: int = 25       # 分析期限
                 ):
        self.system_cost = system_cost
        self.annual_yield = annual_yield
        self.electricity_rate = electricity_rate
        self.feed_in_tariff = feed_in_tariff
        self.self_consumption_rate = self_consumption_rate
        self.annual_maintenance = annual_maintenance
        self.discount_rate = discount_rate
        self.inflation_rate = inflation_rate
        self.electricity_price_increase = electricity_price_increase
        self.analysis_period = analysis_period
    
    def calculate_payback_period(self, 
                                  yield_projection: List[float]
                                  ) -> Dict:
        """
        计算投资回收期
        
        Returns:
            simple_payback: 简单回收期 (年)
            discounted_payback: 折现回收期 (年)
        """
        cumulative_savings = 0
        cumulative_discounted_savings = 0
        simple_payback = None
        discounted_payback = None
        
        for year in range(1, self.analysis_period + 1):
            # 当年发电量
            year_yield = yield_projection[year - 1]
            
            # 当年电价 (考虑增长)
            current_rate = self.electricity_rate * (1 + self.electricity_price_increase) ** (year - 1)
            
            # 当年收益
            self_consumption_savings = year_yield * self.self_consumption_rate * current_rate
            feed_in_revenue = year_yield * (1 - self.self_consumption_rate) * self.feed_in_tariff
            year_revenue = self_consumption_savings + feed_in_revenue
            
            # 当年净收益
            year_maintenance = self.annual_maintenance * (1 + self.inflation_rate) ** (year - 1)
            year_net_savings = year_revenue - year_maintenance
            
            # 累计
            cumulative_savings += year_net_savings
            
            # 折现
            discount_factor = 1 / (1 + self.discount_rate) ** year
            cumulative_discounted_savings += year_net_savings * discount_factor
            
            # 判断回收
            if simple_payback is None and cumulative_savings >= self.system_cost:
                # 插值计算精确回收期
                previous_cumulative = cumulative_savings - year_net_savings
                fraction = (self.system_cost - previous_cumulative) / year_net_savings
                simple_payback = year - 1 + fraction
            
            if discounted_payback is None and cumulative_discounted_savings >= self.system_cost:
                previous_cumulative = cumulative_discounted_savings - year_net_savings * discount_factor
                fraction = (self.system_cost - previous_cumulative) / (year_net_savings * discount_factor)
                discounted_payback = year - 1 + fraction
        
        return {
            'simple_payback_years': simple_payback or '>25',
            'discounted_payback_years': discounted_payback or '>25',
            'cumulative_savings_25y': cumulative_savings,
            'cumulative_discounted_savings_25y': cumulative_discounted_savings
        }
    
    def calculate_irr(self, yield_projection: List[float]) -> float:
        """
        计算内部收益率 (IRR)
        """
        cash_flows = [-self.system_cost]  # 初始投资
        
        for year in range(1, self.analysis_period + 1):
            year_yield = yield_projection[year - 1]
            current_rate = self.electricity_rate * (1 + self.electricity_price_increase) ** (year - 1)
            
            self_consumption_savings = year_yield * self.self_consumption_rate * current_rate
            feed_in_revenue = year_yield * (1 - self.self_consumption_rate) * self.feed_in_tariff
            year_maintenance = self.annual_maintenance * (1 + self.inflation_rate) ** (year - 1)
            
            net_cash_flow = self_consumption_savings + feed_in_revenue - year_maintenance
            cash_flows.append(net_cash_flow)
        
        # 使用numpy计算IRR
        irr = np.irr(cash_flows)
        
        return irr * 100  # 转换为百分比
    
    def calculate_npv(self, yield_projection: List[float]) -> float:
        """
        计算净现值 (NPV)
        """
        npv = -self.system_cost
        
        for year in range(1, self.analysis_period + 1):
            year_yield = yield_projection[year - 1]
            current_rate = self.electricity_rate * (1 + self.electricity_price_increase) ** (year - 1)
            
            self_consumption_savings = year_yield * self.self_consumption_rate * current_rate
            feed_in_revenue = year_yield * (1 - self.self_consumption_rate) * self.feed_in_tariff
            year_maintenance = self.annual_maintenance * (1 + self.inflation_rate) ** (year - 1)
            
            net_cash_flow = self_consumption_savings + feed_in_revenue - year_maintenance
            
            discount_factor = 1 / (1 + self.discount_rate) ** year
            npv += net_cash_flow * discount_factor
        
        return npv
    
    def calculate_lcoe(self, 
                       yield_projection: List[float],
                       include_storage: bool = False,
                       storage_cost: float = 0,
                       storage_replacement_year: int = 10
                       ) -> float:
        """
        计算平准化度电成本 (LCOE)
        
        LCOE = 总成本现值 / 总发电量现值
        """
        total_cost_pv = self.system_cost
        if include_storage:
            total_cost_pv += storage_cost
        
        total_generation_pv = 0
        
        for year in range(1, self.analysis_period + 1):
            # 运维成本现值
            year_maintenance = self.annual_maintenance * (1 + self.inflation_rate) ** (year - 1)
            discount_factor = 1 / (1 + self.discount_rate) ** year
            total_cost_pv += year_maintenance * discount_factor
            
            # 储能更换成本
            if include_storage and year == storage_replacement_year:
                replacement_cost = storage_cost * 0.6  # 假设更换成本为原成本60%
                total_cost_pv += replacement_cost * discount_factor
            
            # 发电量现值
            year_yield = yield_projection[year - 1]
            total_generation_pv += year_yield * discount_factor
        
        lcoe = total_cost_pv / total_generation_pv
        
        return lcoe  # 元/kWh
    
    def generate_financial_summary(self, yield_projection: List[float]) -> Dict:
        """
        生成财务分析摘要
        """
        payback = self.calculate_payback_period(yield_projection)
        irr = self.calculate_irr(yield_projection)
        npv = self.calculate_npv(yield_projection)
        lcoe = self.calculate_lcoe(yield_projection)
        
        total_generation = sum(yield_projection)
        total_savings = payback['cumulative_savings_25y']
        roi = (total_savings - self.system_cost) / self.system_cost * 100
        
        return {
            'investment': {
                'system_cost': self.system_cost,
                'cost_per_watt': self.system_cost / (yield_projection[0] / 1000),  # 假设首年full capacity
            },
            'returns': {
                'simple_payback_years': payback['simple_payback_years'],
                'discounted_payback_years': payback['discounted_payback_years'],
                'irr_percent': round(irr, 2),
                'npv': round(npv, 2),
                'roi_percent': round(roi, 2),
                'total_25y_savings': round(total_savings, 2),
            },
            'generation': {
                'year1_kwh': yield_projection[0],
                'total_25y_kwh': total_generation,
                'lcoe_per_kwh': round(lcoe, 4),
            }
        }


---

