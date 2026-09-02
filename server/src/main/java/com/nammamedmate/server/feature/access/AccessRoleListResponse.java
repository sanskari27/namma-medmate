package com.nammamedmate.server.feature.access;

import com.nammamedmate.server.application.access.AccessRoleView;
import com.nammamedmate.server.application.access.ModuleCatalogItem;
import java.util.List;

public record AccessRoleListResponse(List<AccessRoleView> roles, List<ModuleCatalogItem> catalog) {}
